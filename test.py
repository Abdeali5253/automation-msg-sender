import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By  # Import the correct 'By' module for newer Selenium
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
import time
import os

# Path to the chromedriver (make sure you include .exe for Windows)
chrome_driver_path = "D:/chromedriver-win64/chromedriver.exe"

# Initialize the Chrome driver using the Service object
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service)

# Function to send WhatsApp message using Selenium
def send_whatsapp_message(phone_no, message):
    try:
        # Convert phone number to string and remove any decimals
        phone_no = str(int(float(phone_no)))  # Handling float to avoid issues with decimal points
        
        # Navigate to the WhatsApp Web with the phone number and message pre-filled
        driver.get(f"https://web.whatsapp.com/send?phone={phone_no}&text={message}")
        time.sleep(8)  # Wait for the page to load (adjust this based on your internet speed)
        
        # Locate the input box and press Enter to send the message
        input_box = driver.find_element(By.XPATH, '//div[@title="Type a message"]')
        input_box.send_keys(Keys.ENTER)
        time.sleep(3)  # Wait for the message to send
        return f"Message sent to {phone_no}"
    except Exception as e:
        return f"Failed to send message to {phone_no}: {e}"

# Open WhatsApp Web and wait for user to scan QR code
driver.get("https://web.whatsapp.com")
input("Press ENTER after scanning the QR code and WhatsApp Web is ready...")

# Define the file path for either CSV or Excel
file_path = "test.csv"  # Update this with the actual path to your file

# Function to read CSV or Excel based on file extension
def read_file(file_path):
    # Get the file extension
    file_extension = os.path.splitext(file_path)[1].lower()

    # Check if the file is CSV or Excel and read it accordingly
    if file_extension == '.csv':
        df = pd.read_csv(file_path)
    elif file_extension in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path)
    else:
        raise ValueError("Unsupported file format. Please provide a CSV or Excel file.")

    return df

# Read the file (CSV or Excel)
df = read_file(file_path)

# Message template
message_template = "Hello {name}, this is a test message in bulk"

# Sending messages in bulk
for index, row in df.iterrows():
    name = str(row['NAMES'])  # Convert name to string
    phone = row['Telephone#']     # Phone numbers are likely floats (due to Excel formatting), we'll handle that below

    # Customize the message for each recipient
    message = message_template.replace("{name}", name)
    
    # Send the customized message
    result = send_whatsapp_message(phone, message)
    print(result)

# Close the browser after sending all messages
driver.quit()
