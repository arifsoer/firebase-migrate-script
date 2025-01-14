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
const loadAllSourceData = async (perusahaan) => {
  // load client
  const clients = await dbSource.collection('client').where('perusahaan', '==', perusahaan.ref).get()
  // load department tk per client
  let departmentTk = []
  for (let index = 0; index < clients.docs.length; index++) {
    const docClient = clients.docs[index];
    const depTks = await dbSource.collection('departmentTK').where('clientId', '==', docClient.ref).get()
    departmentTk = [...departmentTk, ...depTks.docs]
  }

  // load karyawan
  const karyawans = await dbSource.collection('karyawan').where('perusahaan', '==', perusahaan.ref).get();
  // load departmentfrom Karyawan
  let departments = []
  let jabatans = []
  for (let index = 0; index < karyawans.docs.length; index++) {
    const karDoc = karyawans.docs[index];
    const karData = karDoc.data()
    const theDeparts = await karData.department.get();
    const theJabatans = theDeparts.data().listJabatanRef;
    for (let indJabatan = 0; indJabatan < theJabatans.length; indJabatan++) {
      const theJabatan = theJabatans[indJabatan];
      const jabatanSnap = await theJabatan.get();
      jabatans.push(jabatanSnap)
    }
    departments.push(theDeparts)
  }

  // load sample Document
  const sampleDocuments = await dbSource.collection('sampleDocuments').where('company', '==', perusahaan.ref).get();
  // load templates from sample and perusahaan
  let templates = []
  for (let indSam = 0; indSam < sampleDocuments.docs.length; indSam++) {
    const docSample = sampleDocuments.docs[indSam];
    const template = await dbSource.collection('templateDocuments').where('perusahaan', '==', perusahaan.ref).where('sampleDocument', '==', docSample.ref).get();
    templates = [...templates, ...template.docs]
  }

  // load data tenaga kerja
  // load generated document

  console.log(`check data from ${perusahaan.data().nama}`, {
    clients: clients.docs.length,
    departmentTk: departmentTk.length,
    karyawans: karyawans.docs.length,
    departmentUser: departments.length,
    jabatans: jabatans.length,
    sampleDocuments: sampleDocuments.docs.length,
    templateDocuments: templates.length
  })
  const returnData = {
    clients: clients.docs,
    departmentTk: departmentTk,
    karyawans: karyawans.docs,
    departmentUser: departments,
    jabatans: jabatans,
    sampleDocuments: sampleDocuments.docs,
    templateDocuments: templates
  }
  return returnData;
}

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
        const sourceData = await loadAllSourceData(doc)

        if (existingPerusahaan.includes(docData.nama)) {
          const destinationPerusahaan = getDestinationPerusahaanList.docs.find(
            (d) => d.data().nama === docData.nama
          );
          // await migratePerusahaanData(destinationPerusahaan);
        } else {
          // save perusahaan data first
          // await dbDestination.collection("perusahaan").doc(doc.id).set(docData);

          // await migratePerusahaanData(doc);
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
};

startMigrate();
