# gsheet-fb-contribution-tracking-script

A Google Apps Script for tracking contribution and attendance of facebook event in google sheet .
Allows importing facebook event attendance info from csv file.
Paid status and additional info is persisted across imports unless.

⚠️ Status column is not internationalized because I don't care.  
If you use csv with statuses in different language every record will be treated as status change

## How

1. Copy contents of script.js into your Google Apps Script script file
2. Assign function `startCSVUpload` to a button (a drawing) in the spreadsheet
3. Fill in the legend cells:  
   A1: Name and surname  
   A2: Attendance Status (Recommened: Coditional formatting based on status)  
   A3: Paid? (checkbox) (Recommended: Conditional formatting based on if cell is true/false)  
   A4: Additional info

![Example table](docs1.jpg)
![Import summary screen](docs2.jpg)
