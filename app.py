from flask import Flask, request, jsonify
import pandas as pd
import pywhatkit as kit
import pyautogui
import time
import threading
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the uploads directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Function to send WhatsApp message using pywhatkit
def send_whatsapp_message(phone_no, message):
    try:
        kit.sendwhatmsg_instantly(phone_no, message)
        time.sleep(8)  # Wait to make sure the message is ready
        pyautogui.press('enter')  # Press 'Enter' to send the message
        return f"Message sent to {phone_no}"
    except Exception as e:
        return f"Failed to send message to {phone_no}: {e}"

# Batch processing function
def process_batch(df, name_col, phone_col, message_template, start, end):
    for index, row in df.iloc[start:end].iterrows():
        name = row[name_col]
        phone_number = row[phone_col]
        # Customize the message with the recipient's name
        message = message_template.replace('{name}', name)

        # Send the WhatsApp message
        result = send_whatsapp_message(phone_number, message)
        print(result)

        # Add delay to avoid triggering WhatsApp anti-bot mechanisms
        time.sleep(5)

# Endpoint to process the CSV and send WhatsApp messages
@app.route('/send-messages', methods=['POST'])
def send_messages():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save the uploaded file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Read the CSV into a DataFrame
    df = pd.read_csv(filepath)

    # Get the column names and message from the request
    name_col = request.form.get('name_column')
    phone_col = request.form.get('phone_column')
    message_template = request.form.get('message')

    if not name_col or not phone_col or not message_template:
        return jsonify({'error': 'Missing name column, phone column, or message'}), 400

    # Batch processing logic (split the data into batches and send messages)
    batch_size = 50  # You can adjust this value as needed
    threads = []

    for i in range(0, len(df), batch_size):
        start = i
        end = min(i + batch_size, len(df))
        t = threading.Thread(target=process_batch, args=(df, name_col, phone_col, message_template, start, end))
        threads.append(t)
        t.start()

    # Wait for all threads to finish
    for t in threads:
        t.join()

    return jsonify({'status': 'Messages sent successfully'})

if __name__ == '__main__':
    app.run(debug=True)
