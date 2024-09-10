# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import pandas as pd
# import pywhatkit as kit
# import pyautogui
# import time
# import threading
# import os
# from werkzeug.utils import secure_filename

# app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type"])

# UPLOAD_FOLDER = './uploads'
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# # Ensure the uploads directory exists
# if not os.path.exists(UPLOAD_FOLDER):
#     os.makedirs(UPLOAD_FOLDER)

# # Function to send WhatsApp message using pywhatkit
# def send_whatsapp_message(phone_no, message):
#     try:
#         # Ensure phone number is treated as a string and contains a "+"
#         phone_no = phone_no.strip()  # Remove any leading/trailing whitespace
#         if not phone_no.startswith("+"):
#             raise ValueError("Country Code Missing in Phone Number!")
#         kit.sendwhatmsg_instantly(phone_no, message)
#         time.sleep(2)  # Shorter wait to make sure the message is ready
#         pyautogui.press('enter')  # Press 'Enter' to send the message
#         return f"Message sent to {phone_no}"
#     except Exception as e:
#         return f"Failed to send message to {phone_no}: {e}"

# # Batch processing function
# def process_batch(df, name_col, phone_col, message_template, start, end):
#     for index, row in df.iloc[start:end].iterrows():
#         name = row[name_col].strip()
#         phone_number = row[phone_col].strip()

#         # Skip empty or invalid phone numbers
#         if not phone_number or pd.isna(phone_number):
#             print(f"Skipping row {index} due to missing phone number")
#             continue

#         # Remove any trailing '.0' from the phone number (if exists)
#         if '.' in phone_number:
#             phone_number = phone_number.split('.')[0]

#         # Customize the message with the recipient's name
#         message = message_template.replace('{name}', name)

#         # Send the WhatsApp message
#         result = send_whatsapp_message(phone_number, message)
#         print(result)

#         # Add a short delay to avoid rapid sending
#         time.sleep(2)

# # Endpoint to process the file (Excel or CSV) and send WhatsApp messages
# @app.route('/send-messages', methods=['POST'])
# def send_messages():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part'}), 400
#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No selected file'}), 400

#     # Save the uploaded file
#     filename = secure_filename(file.filename)
#     filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#     file.save(filepath)

#     # Determine if the file is an Excel file or a CSV file based on its extension
#     if filename.endswith('.xlsx') or filename.endswith('.xls'):
#         # Read the Excel file into a DataFrame
#         df = pd.read_excel(filepath, dtype=str)  # All columns as strings
#     elif filename.endswith('.csv'):
#         # Read the CSV file into a DataFrame
#         df = pd.read_csv(filepath, dtype=str)  # All columns as strings
#     else:
#         return jsonify({'error': 'Unsupported file format. Only CSV and Excel files are supported.'}), 400

#     # Fill NaN values with an empty string
#     df = df.fillna('')

#     # Strip whitespace from column values
#     # Strip whitespace from string column values only
#     df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)


#     # Remove any rows where the phone column is empty
#     df = df[df['Telephone#'].str.strip() != '']

#     # Get the column names and message from the request
#     name_col = request.form.get('name_column')
#     phone_col = request.form.get('phone_column')
#     message_template = request.form.get('message')

#     if not name_col or not phone_col or not message_template:
#         return jsonify({'error': 'Missing name column, phone column, or message'}), 400

#     # Batch processing logic
#     batch_size = 50  # Adjust this as needed
#     total_rows = len(df)
#     threads = []

#     # Create and start threads for each batch
#     for i in range(0, total_rows, batch_size):
#         start = i
#         end = min(i + batch_size, total_rows)
#         t = threading.Thread(target=process_batch, args=(df, name_col, phone_col, message_template, start, end))
#         threads.append(t)
#         t.start()

#     # Wait for all threads to finish
#     for t in threads:
#         t.join()

#     return jsonify({'status': 'Messages sent successfully'})


# if __name__ == '__main__':
#     app.run(debug=True)

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pywhatkit as kit
import pyautogui
import time
import threading
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type"])

UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the uploads directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Function to send WhatsApp message using pywhatkit
def send_whatsapp_message(phone_no, message):
    try:
        phone_no = phone_no.strip()  # Remove any leading/trailing whitespace
        if not phone_no.startswith("+"):
            raise ValueError("Country Code Missing in Phone Number!")
        kit.sendwhatmsg_instantly(phone_no, message)
        time.sleep(2)  # Shorter wait to make sure the message is ready
        pyautogui.press('enter')  # Press 'Enter' to send the message
        return f"Message sent to {phone_no}"
    except Exception as e:
        return f"Failed to send message to {phone_no}: {e}"

# Batch processing function
def process_batch(df, name_col, phone_col, balance_col, message_template, start, end):
    for index, row in df.iloc[start:end].iterrows():
        name = row[name_col].strip()
        phone_number = row[phone_col].strip()
        balance = row[balance_col].strip()  # Ensure the balance is treated as a string

        # Skip empty or invalid phone numbers
        if not phone_number or pd.isna(phone_number):
            print(f"Skipping row {index} due to missing phone number")
            continue

        # Remove any trailing '.0' from the phone number (if exists)
        if '.' in phone_number:
            phone_number = phone_number.split('.')[0]

        # Customize the message with the recipient's name and balance
        message = message_template.replace('{name}', name).replace('{balance}', f"PKR {balance}.00")

        # Send the WhatsApp message
        result = send_whatsapp_message(phone_number, message)
        print(result)

        # Add a short delay to avoid rapid sending
        time.sleep(2)


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

    # Determine if the file is an Excel file or a CSV file based on its extension
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        # Read the Excel file into a DataFrame
        df = pd.read_excel(filepath, dtype=str)  # All columns as strings
    elif filename.endswith('.csv'):
        # Read the CSV file into a DataFrame
        df = pd.read_csv(filepath, dtype=str)  # All columns as strings
    else:
        return jsonify({'error': 'Unsupported file format. Only CSV and Excel files are supported.'}), 400

    # Fill NaN values with an empty string
    df = df.fillna('')

    # Get the column names and message from the request form data
    name_col = request.form.get('name_column')
    phone_col = request.form.get('phone_column')
    balance_col = request.form.get('balance_column')
    message_template = request.form.get('message')

    # Check if the required form data is missing
    if not name_col or not phone_col or not balance_col or not message_template:
        return jsonify({'error': 'Missing one or more required fields: name_column, phone_column, balance_column, message'}), 400

    # Strip all leading and trailing whitespaces from column values
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    # Remove any rows where the phone column is empty
    if phone_col in df.columns:
        df = df[df[phone_col].str.strip() != '']
    else:
        return jsonify({'error': f'{phone_col} column not found in the file'}), 400

    # Batch processing logic
    batch_size = 50  # Adjust this as needed
    total_rows = len(df)
    threads = []

    # Create and start threads for each batch
    for i in range(0, total_rows, batch_size):
        start = i
        end = min(i + batch_size, total_rows)
        t = threading.Thread(target=process_batch, args=(df, name_col, phone_col, balance_col, message_template, start, end))
        threads.append(t)
        t.start()

    # Wait for all threads to finish
    for t in threads:
        t.join()

    return jsonify({'status': 'Messages sent successfully'})



if __name__ == '__main__':
    app.run(debug=True)
