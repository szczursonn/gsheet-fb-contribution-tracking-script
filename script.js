const TABLE_LENGTH=200

function _sortByName(attendees) {
  attendees.sort((a, b) => {
    if ( a.name < b.name ){
    return -1;
    }
    if ( a.name > b.name ){
      return 1;
    }
    return 0;
  })
}

// STEP 1
function startCSVUpload() {
  var ui = SpreadsheetApp.getUi();
  
  var htmlOutput = HtmlService
    .createHtmlOutput(`
      <input type="file" id="2137" multiple="false">
      <button id="submit-btn" disabled="true">Submit</button>
      <script>
        const inputEl = document.getElementById('2137')
        const submitBtn = document.getElementById('submit-btn')
        inputEl.addEventListener('change', (e) => {
          if (inputEl.files.length < 1) {
            submitBtn.disabled = true
          } else {
            submitBtn.disabled = false
          }
        })
        submitBtn.addEventListener('click', async (e) => {
          const f = inputEl.files[0]
          google.script.run
            .withSuccessHandler(google.script.host.close)
            .withFailureHandler((err)=>{
              alert(err)
              google.script.host.close()
            })
            .handleCSVSubmit(await f.text())
        })
      </script>
      <style>
        body {      
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
      </style>
      `)
    .setWidth(360)
    .setHeight(100)
  
  ui.showModalDialog(htmlOutput, 'Upload CSV');
}

// STEP 2
function handleCSVSubmit(rawCsv) {
  let updatedAttendees = rawCsv.split('\n').map((row)=>{
      row = row.trim().split(',')
      for (let i of [0,1]) {
          if (row[i] !== undefined && row[i].startsWith('"')) {
              row[i]=row[i].substr(1, row[i].length-2)
          }
      }
      return row
  })
  updatedAttendees.shift()
  updatedAttendees.pop()

  const sheet = SpreadsheetApp.getActiveSheet()
  let currentAttendees = sheet.getRange(2, 1, TABLE_LENGTH, 4).getValues().filter(row=>row[0]!=='')

  updatedAttendees = updatedAttendees.map((row) => {
    return {
      name: row[0],
      status: row[1],
      paid: false,
      extra: '',
      presentInCurrentAttendees: true
    }
  })

  currentAttendees = currentAttendees.map((row) => {
    return {
      name: row[0],
      status: row[1],
      paid: row[2],
      extra: row[3],
      seen: false // to determine which records to delete later
    }
  })

  // they weren't on the list and now they are
  const newAttendees = []
  // they were on the list but their status changed
  const statusChangedAttendees = []
  // count of untouched attendees
  let noChangeCount = 0

  for (const att of updatedAttendees) {
    const curr = currentAttendees.find(cAtt=>cAtt.name===att.name)

    if (curr) {
      att.paid = curr.paid
      att.extra = curr.extra
      if (curr.status !== att.status) {
        statusChangedAttendees.push({
          ...att,
          oldStatus: curr.status
        })
      } else {
        noChangeCount++
      }

      curr.seen = true
    } else {
      newAttendees.push({
        ...att
      })
    }
  }

  // they were on the list but now they are not
  // shallow copy to be safe
  const deletedAttendees = currentAttendees.filter(cAtt=>cAtt.seen===false).map(x=>{
    return {...x}
  })

  _sortByName(newAttendees)
  _sortByName(statusChangedAttendees)
  _sortByName(deletedAttendees)

  const ui = SpreadsheetApp.getUi()

  var htmlOutput = HtmlService
    .createHtmlOutput(`
      <div>
        ${newAttendees.length > 0 ? `
          <h3>New attendees (${newAttendees.length}): </h3>
          <table>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
            ${newAttendees.map((att)=>`
              <tr>
                <td>${att.name}</td>
                <td>${att.status}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        ${statusChangedAttendees.length > 0 ? `
          <hr />
          <h3>Status changed (${statusChangedAttendees.length}): </h3>
          <table>
            <tr>
              <th>Name</th>
              <th>Status change</th>
              <th>Has paid?</th>
              <th>Extra info</th>
            </tr>
            ${statusChangedAttendees.map((att)=>`
              <tr>
                <td>${att.name}</td>
                <td>${att.oldStatus} -> ${att.status}</td>
                <td>${att.paid ? '✔️' : '❌'}</td>
                <td>${att.extra}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        ${deletedAttendees.length > 0 ? `
          <hr />
          <h3>Removed attendees (${deletedAttendees.length}): </h3>
          <table>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Has paid?</th>
              <th>Extra info</th>
            </tr>
            ${deletedAttendees.map((att)=>`
              <tr>
                <td>${att.name}</td>
                <td>${att.status}</td>
                <td>${att.paid ? '✔️' : '❌'}</td>
                <td>${att.extra}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        ${noChangeCount > 0 ? `
          <hr />
          <h4>Attendees without changes: ${noChangeCount}</h4>
        ` : ''}
      </div>
      <hr />
      <p class="warning">CHECK IF CHANGES ARE VALID BEFORE SUBMITING!!!</p>
      <input type="checkbox" id="confirm-checkbox">
      <label for="confirm-checkbox">yes very nice data</label>
      <button id='cancel-btn'>Cancel</button>
      <button id='submit-btn' disabled='true'>Import</button>
      <script>
        const data = '${JSON.stringify(updatedAttendees)}'
        const submitBtn = document.getElementById('submit-btn')

        document.getElementById('cancel-btn').addEventListener('click', ()=>google.script.host.close())
        submitBtn.addEventListener('click', () => {
          google.script.run.withSuccessHandler(google.script.host.close).updateSheet(data)
        })
        document.getElementById('confirm-checkbox').addEventListener('change', (e) => {
          if (e.currentTarget.checked) {
            submitBtn.disabled = false
          } else {
            submitBtn.disabled = true
          }
        })
      </script>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        th {
          font-weight: bold;
          text-align: left;
        }
        table, td, th {
          border: 1px solid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .warning {
          color: red;
          font-weight: bold;
          font-size: x-large;
        }
      </style>
      `)
    .setWidth(1200)
    .setHeight(800)
  ui.showModalDialog(htmlOutput, 'Import Summary');
}

// STEP 3
function updateSheet(json) {
  const data = JSON.parse(json)

  _sortByName(data)

  const attendeeData = data.map((att)=>{
    return [att.name, att.status, att.paid, att.extra]
  })
  
  const sheet = SpreadsheetApp.getActiveSheet()
  sheet.getRange(2, 1, TABLE_LENGTH, 4).clearContent()
  sheet.getRange(2, 1, attendeeData.length, 4).setValues(attendeeData)
}