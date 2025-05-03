require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore, doc, Query } = require("firebase-admin/firestore");

const destinationProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.DESTINATION_PROJECT ?? "",
  },
  "destination"
);

const sourceProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.SOURCE_PROJECT ?? "",
  },
  "source"
);

// const dbDestination = getFirestore(
//   destinationProject,
//   process.env.DESTINATION_DB ?? "pkwt-prod-dev-temp"
// );
const dbDestination = destinationProject.firestore();
const dbSource = getFirestore(
  sourceProject,
  process.env.SOURCE_DB ?? "default"
);

module.exports = {
  dbDestination,
  dbSource,
};