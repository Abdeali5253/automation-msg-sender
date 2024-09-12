from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pywhatkit as kit
import pyautogui
import time
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type"])

UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def send_whatsapp_message(phone_no, message):
    try:
        phone_no = phone_no.strip()
        if not phone_no.startswith("+"):
            raise ValueError("Country Code Missing in Phone Number!")
        kit.sendwhatmsg_instantly(phone_no, message)
        time.sleep(2)
        pyautogui.press('enter')
        return f"Message sent to {phone_no}"
    except Exception as e:
        return f"Failed to send message to {phone_no}: {e}"

def process_batch(df, name_col, mumin_id_col, registered_for_col, phone_col, message_template, start, end):
    for index, row in df.iloc[start:end].iterrows():
        name = row[name_col].strip()
        mumin_id = row[mumin_id_col].strip()
        registered_for = row[registered_for_col].strip()
        phone_number = row[phone_col].strip()

        if not phone_number or pd.isna(phone_number):
            print(f"Skipping row {index} due to missing phone number")
            continue

        if '.' in phone_number:
            phone_number = phone_number.split('.')[0]

        # Customize the message with the recipient's details
        message = (message_template.replace('{name}', name)
                                   .replace('{Mumin_ID}', mumin_id)
                                   .replace('{Registered_For}', registered_for))

        result = send_whatsapp_message(phone_number, message)
        print(result)
        time.sleep(2)

@app.route('/send-messages', methods=['POST'])
def send_messages():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        df = pd.read_excel(filepath, dtype=str)
    elif filename.endswith('.csv'):
        df = pd.read_csv(filepath, dtype=str)
    else:
        return jsonify({'error': 'Unsupported file format. Only CSV and Excel files are supported.'}), 400

    df = df.fillna('')

    name_col = request.form.get('name_column')
    mumin_id_col = request.form.get('mumin_id_column')
    registered_for_col = request.form.get('registered_for_column')
    phone_col = request.form.get('mobile_column')
    message_template = request.form.get('message')

    if not name_col or not phone_col or not mumin_id_col or not registered_for_col or not message_template:
        return jsonify({'error': 'Missing one or more required fields: name_column, phone_column, mumin_id_column, registered_for_column, message'}), 400

    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    if phone_col in df.columns:
        df = df[df[phone_col].str.strip() != '']
    else:
        return jsonify({'error': f'{phone_col} column not found in the file'}), 400

    total_rows = len(df)
    batch_size = 50

    for i in range(0, total_rows, batch_size):
        start = i
        end = min(i + batch_size, total_rows)
        process_batch(df, name_col, mumin_id_col, registered_for_col, phone_col, message_template, start, end)

    return jsonify({'status': 'Messages sent successfully'})

if __name__ == '__main__':
    app.run(debug=True)
