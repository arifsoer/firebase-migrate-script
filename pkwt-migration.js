const admin = require("firebase-admin");
const { getFirestore, doc, Query } = require("firebase-admin/firestore");
const fs = require("fs");
const cliProgress = require("cli-progress");

const perusahaanToMigrate = [
  "PT Gemah Ripah",
  "PT. Anugrah Cipta Lokatara",
  "PT. GKN",
  "PT.Indobaja",
];

// Initialize Firebase Admin
const sourceProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: "e-pkwt-14644",
  },
  "source"
);

const destinationProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: "e-pkwt-6d0f0",
  },
  "destination"
);

const dbSource = getFirestore(sourceProject);
const dbDestination = getFirestore(destinationProject, "pkwt-prod-dev-temp");

/**
 *
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaan
 */
const migrateClient = async (perusahaan) => {
  const sourceClient = await dbSource
    .collection("client")
    .where("perusahaan", "==", perusahaan.ref)
    .get();
  // const destinationClient = await dbDestination
  //   .collection("client")
  //   .where("perusahaan", "==", perusahaan.ref)
  //   .get();

  console.log('sourceClient', sourceClient.docs);
  // console.log("perusahaan id :", perusahaan.id);
  // console.log("perusahaan ref :", perusahaan.ref);
};

/**
 *
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaan
 */
const migrateDepartmentTk = async (perusahaan) => {
  const sourceDepartmentTk = await dbSource
    .collection("departmentTk")
    .where("perusahaan", "==", perusahaanId)
    .get();
};

/**
 *
 * migrata data perusahaan
 *
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaan
 */
const migratePerusahaanData = async (perusahaan) => {
  const dataPerusahaan = perusahaan.data();
  console.log("start Migrate Perusahaan ", dataPerusahaan.nama);
  console.log("start Migrate Perusahaan id ", perusahaan.id);

  try {
    await migrateClient(perusahaan);
  } catch (error) {
    console.error(error);
  }
};

const startMigrate = async () => {
  try {
    const getSourcePerusahaanList = await dbSource
      .collection("perusahaan")
      .get();
    const getDestinationPerusahaanList = await dbDestination
      .collection("perusahaan")
      .get();

    const existingPerusahaan = getDestinationPerusahaanList.docs.map(
      (doc) => doc.data().nama
    );

    for (let index = 0; index < getSourcePerusahaanList.docs.length; index++) {
      const doc = getSourcePerusahaanList.docs[index];
      const docData = doc.data();
      if (perusahaanToMigrate.includes(docData.nama)) {
        if (existingPerusahaan.includes(docData.nama)) {
          const destinationPerusahaan = getDestinationPerusahaanList.docs.find(
            (d) => d.data().nama === docData.nama
          );
          await migratePerusahaanData(destinationPerusahaan);
        } else {
          // save perusahaan data first
          // await dbDestination.collection("perusahaan").doc(doc.id).set(docData);

          const sourcePerusahaan = doc;
          await migratePerusahaanData(sourcePerusahaan);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};

startMigrate();
