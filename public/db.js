const indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function (event) {
    const db = event.target.result;
    db.createObjectStore("pending", { autoIncrement: true});
};

request.onsuccess = function (event) {
    db = event.target.result;

    //check if app is online before reading from db
    if (navigator.onLine) {
        checkDatatbase();
    }
};

request.onerror = function (event) {
    console.log("Whoops!" + event.target.errorCode);
};

//saves transaction while user is offline
function saveRecord(record) {
    const transaction = db.transaction("pending", "readwrite");
    const store = transaction.objectStrore("pending");

    store.add(record);
};

//called when user goes online to send transactions stored in db to server
function checkDatatbase() {
    const transaction = db.transaction(["pending"], "readwrite");
    const store = transaction.objectStrore("pending");
    const getAll = store.getAll();

    getAll.onsuccess = function () {
        if (getAll.result.length > 0) {
            fetch("/api/transaction/bulk", {
                method: "POST",
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(() => {
                //delete records if successful
                const transaction = db.transaction(["pending"], "readwrite");
                const store = transaction.objectStrore("pending");
                store.clear();
            });
        }
    }
}

function deletePending() {
    const transaction = db.transaction(["pending"], "readwrite");
    const store = transaction.objectStrore("pending");
    store.clear();
}

//listen for app coming back online
window.addEventListener("online", checkDatatbase);