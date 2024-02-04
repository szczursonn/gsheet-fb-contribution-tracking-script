const TABLE_LENGTH = 200;

// STEP 1
function startCSVUpload() {
    const htmlOutput = HtmlService.createHtmlOutputFromFile('csvUpload')
        .setWidth(360)
        .setHeight(100);

    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Upload CSV');
}

// STEP 2
function handleCSVSubmit(csvText) {
    const facebookAttendeesMap = new Map(
        csvText
            .trim()
            .split('\n')
            .slice(1)
            .map((row) =>
                row
                    .trim()
                    .split(',')
                    .map((cell) => {
                        if (cell.startsWith('"')) {
                            cell = cell.substring(1);
                        }

                        if (cell.endsWith('"')) {
                            cell = cell.substring(0, cell.length - 1);
                        }

                        return cell;
                    })
            )
            .map((rowCells) => [
                rowCells[0],
                { name: rowCells[0], status: rowCells[1] }
            ])
    );

    const currentSheet = SpreadsheetApp.getActiveSheet();
    const oldAttendees = currentSheet
        .getRange(2, 1, TABLE_LENGTH, 5)
        .getValues()
        .filter((row) => !!row[0])
        .map((row) => ({
            name: row[0],
            status: row[1],
            syncWithFb: !!row[2],
            paid: row[3],
            extraInfo: row[4]
        }));

    const statusChangedAttendees = [];
    const deletedAttendees = [];

    const currentAttendees = [];
    let noChangeCount = 0;
    let unsyncedCount = 0;

    for (const attendee of oldAttendees) {
        const fbAttendee = facebookAttendeesMap.get(attendee.name);
        facebookAttendeesMap.delete(attendee.name);

        if (!attendee.syncWithFb) {
            // attendee should not be synced with fb - ignore
            unsyncedCount++;
            currentAttendees.push(attendee);
            continue;
        }

        if (!fbAttendee) {
            // attendee not present in facebook but was before - he was deleted
            deletedAttendees.push(attendee);
            continue;
        }

        if (fbAttendee.status !== attendee.status) {
            // attendee is present but status changed
            attendee.oldStatus = attendee.status;
            attendee.status = fbAttendee.status;

            statusChangedAttendees.push(attendee);
            currentAttendees.push(attendee);
            continue;
        }

        // no changes
        noChangeCount++;
        currentAttendees.push(attendee);
    }
    const addedAttendees = [...facebookAttendeesMap.values()].map(
        (attendee) => ({
            ...attendee,
            syncWithFb: true,
            paid: 0,
            extraInfo: ''
        })
    );

    currentAttendees.push(...addedAttendees);

    _sortAttendeesByName(addedAttendees);
    _sortAttendeesByName(statusChangedAttendees);
    _sortAttendeesByName(deletedAttendees);
    _sortAttendeesByName(currentAttendees);

    const template = HtmlService.createTemplateFromFile('importSummary');
    template.data = {
        addedAttendees,
        statusChangedAttendees,
        deletedAttendees,
        noChangeCount,
        unsyncedCount,
        currentAttendees
    };

    const htmlOutput = template.evaluate().setWidth(1400).setHeight(800);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Import Summary');
}

function _sortAttendeesByName(attendees) {
    return attendees.sort((a, b) => (a.name > b.name ? 1 : -1));
}

// STEP 3
function updateSheet(attendees) {
    _sortAttendeesByName(attendees);

    const attendeeCells = attendees.map((attendee) => [
        attendee.name,
        attendee.status,
        attendee.syncWithFb,
        attendee.paid,
        attendee.extraInfo
    ]);

    console.log(attendeeCells);

    const currentSheet = SpreadsheetApp.getActiveSheet();
    currentSheet.getRange(2, 1, TABLE_LENGTH, 5).clearContent();
    currentSheet.getRange(2, 1, attendees.length, 5).setValues(attendeeCells);
}
