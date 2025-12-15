const admin = require("firebase-admin");
const serviceAccount = require("./firebase/serviceAccountKey.json"); // keep correct path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Paste your token here
const token = "cId3G3E-QEO_ZN5KD8pVFR:APA91bHnBLFi9izpgXUqHHvo4d3DGqZMGgfqbWJ16jfEL379Ds1qC3QVR8YvtAfjGSKcVll9FAARcKaSqn7O2e6oZjY_XkNgHoFfoqKcnhP465J9PyQPYb4";

admin.messaging().send({
  token,
  notification: {
    title: "Token Test",
    body: "Checking if this token is valid"
  }
})
.then((res) => {
  console.log("✔️ VALID TOKEN");
  console.log("FCM Response:", res);
})
.catch((err) => {
  console.log("❌ INVALID TOKEN");
  console.log(err.errorInfo || err);
});
