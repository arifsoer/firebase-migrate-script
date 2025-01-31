require("dotenv").config();
const admin = require("firebase-admin");
const moment = require("moment");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore, doc, Query } = require("firebase-admin/firestore");
const fs = require("fs");
const cliProgress = require("cli-progress");
const NodeUtil = require("util");
const exec = NodeUtil.promisify(require("child_process").exec);

const perusahaanToMigrate = [
  "PT Gemah Ripah",
  "PT. Anugrah Cipta Lokatara",
  "PT. GKN",
  "PT.Indobaja",
];

let dataCount = 0;

// Initialize Firebase Admin
const sourceProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.SOURCE_PROJECT ?? "",
  },
  "source"
);

const destinationProject = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.DESTINATION_PROJECT ?? "",
  },
  "destination"
);

// init firestore
const dbSource = getFirestore(
  sourceProject,
  process.env.SOURCE_DB ?? "default"
);
const dbDestination = getFirestore(
  destinationProject,
  process.env.DESTINATION_DB ?? "pkwt-prod-dev-temp"
);

// init storage
const storageSource = getStorage(sourceProject);
const destinationStorage = getStorage(destinationProject);

/**
 *
 * @param {string} path
 */
const startMigrateStorage = async (path) => {
  try {
    const copyDest = destinationStorage
      .bucket(process.env.DESTINATION_BUCKET ?? "")
      .file(path);
    await storageSource
      .bucket(process.env.SOURCE_BUCKET ?? "")
      .file(path)
      .copy(copyDest);
  } catch (error) {
    console.error(error);
  }
};

/**
 *
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaan
 */
const loadAllSourceData = async (perusahaan) => {
  // load client
  const clients = await dbSource
    .collection("client")
    .where("perusahaan", "==", perusahaan.ref)
    .get();
  // load department tk per client
  let departmentTk = [];
  for (let index = 0; index < clients.docs.length; index++) {
    const docClient = clients.docs[index];
    const depTks = await dbSource
      .collection("departmentTK")
      .where("clientId", "==", docClient.ref)
      .get();
    departmentTk = [...departmentTk, ...depTks.docs];
  }

  // load karyawan
  const karyawans = await dbSource
    .collection("karyawan")
    .where("perusahaan", "==", perusahaan.ref)
    .get();
  // load departmentfrom Karyawan
  let departments = [];
  let jabatans = [];
  for (let index = 0; index < karyawans.docs.length; index++) {
    const karDoc = karyawans.docs[index];
    const karData = karDoc.data();
    const theDeparts = await karData.department.get();
    const theJabatans = theDeparts.data().listJabatanRef;
    for (let indJabatan = 0; indJabatan < theJabatans.length; indJabatan++) {
      const theJabatan = theJabatans[indJabatan];
      const jabatanSnap = await theJabatan.get();
      jabatans.push(jabatanSnap);
    }
    departments.push(theDeparts);
  }

  // load sample Document
  const sampleDocuments = await dbSource
    .collection("sampleDocuments")
    .where("company", "==", perusahaan.ref)
    .get();
  // load templates from sample and perusahaan
  let templates = [];
  for (let indSam = 0; indSam < sampleDocuments.docs.length; indSam++) {
    const docSample = sampleDocuments.docs[indSam];
    const template = await dbSource
      .collection("templateDocuments")
      .where("perusahaan", "==", perusahaan.ref)
      .where("sampleDocument", "==", docSample.ref)
      .get();
    templates = [...templates, ...template.docs];
  }

  // load data tenaga kerja
  const tenagaKerjas = await dbSource
    .collection("tenagaKerja")
    .where("perusahaan", "==", perusahaan.ref)
    .get();
  // load generated document
  let genDocsTk = [];
  for (let tkInd = 0; tkInd < tenagaKerjas.docs.length; tkInd++) {
    const tkDoc = tenagaKerjas.docs[tkInd];
    const generatedDocuments = await dbSource
      .collection("generatedDocument")
      .where("perusahaan", "==", perusahaan.ref)
      .where("tenagaKerja", "==", tkDoc.ref)
      .get();
    genDocsTk = [...genDocsTk, ...generatedDocuments.docs];
  }

  const returnData = {
    clients: clients.docs,
    departmentTk: departmentTk,
    karyawans: karyawans.docs,
    departmentUser: departments,
    jabatans: jabatans,
    sampleDocuments: sampleDocuments.docs,
    templateDocuments: templates,
    tenagaKerjas: tenagaKerjas.docs,
    generatedDocuments: genDocsTk,
  };
  return returnData;
};

const isNeedChangePerusahaanId = (listExistingName, perusahaanName) =>
  listExistingName.includes(perusahaanName);

const extractFilePath = (fileUrl) => {
  const decodedUrl = decodeURIComponent(fileUrl);
  const removedQParams = decodedUrl.split("?")[0];
  const removedBaseUrl = removedQParams.split("com/o/")[1];
  return removedBaseUrl
}

const startMigrate = async () => {
  const start = moment();
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
        const sourceData = await loadAllSourceData(doc);

        const destinationPerusahaan = getDestinationPerusahaanList.docs.find(
          (d) => d.data().nama === docData.nama
        );

        if (!existingPerusahaan.includes(docData.nama)) {
          // save perusahaan data first
          // await dbDestination.collection("perusahaan").doc(doc.id).set(docData);
        }

        // save client
        for (let index = 0; index < sourceData.clients.length; index++) {
          const client = sourceData.clients[index];
          const clientData = client.data();
          if (isNeedChangePerusahaanId(existingPerusahaan, docData.nama)) {
            clientData.perusahaan = destinationPerusahaan.ref;
          }
          // await dbDestination.collection("client").doc(client.id).set(clientData);
        }

        // save departmentTK
        for (let index = 0; index < sourceData.departmentTk.length; index++) {
          const depTk = sourceData.departmentTk[index];
          const depTkData = depTk.data();
          // await dbDestination.collection("departmentTK").doc(depTk.id).set(depTkData);
        }

        // save karyawan
        for (let index = 0; index < sourceData.karyawans.length; index++) {
          const karyawan = sourceData.karyawans[index];
          const karyawanData = karyawan.data();
          if (isNeedChangePerusahaanId(existingPerusahaan, docData.nama)) {
            karyawanData.perusahaan = destinationPerusahaan.ref;
          }
          // await dbDestination.collection("karyawan").doc(karyawan.id).set(karyawanData);
        }

        // save departmentUser
        for (let index = 0; index < sourceData.departmentUser.length; index++) {
          const depUser = sourceData.departmentUser[index];
          const depUserData = depUser.data();
          // await dbDestination.collection("departmentUser").doc(depUser.id).set(depUserData);
        }

        // save jabatan
        for (let index = 0; index < sourceData.jabatans.length; index++) {
          const jabatan = sourceData.jabatans[index];
          const jabatanData = jabatan.data();
          // await dbDestination.collection("jabatan").doc(jabatan.id).set(jabatanData);
        }

        // save sampleDocument
        for (let index = 0; index < sourceData.sampleDocuments.length; index++) {
          const sampleDoc = sourceData.sampleDocuments[index];
          const sampleDocData = sampleDoc.data();
          if (isNeedChangePerusahaanId(existingPerusahaan, docData.nama)) {
            sampleDocData.company = destinationPerusahaan.ref;
          }
          // upload the asset
          const rawPath = extractFilePath(sampleDocData.fileUrl);
          await startMigrateStorage(rawPath);

          // generate document url from destination
          const fileUrl = destinationStorage.bucket(process.env.DESTINATION_BUCKET ?? "").file(rawPath);
          
          
          // await dbDestination.collection("sampleDocuments").doc(sampleDoc.id).set(sampleDocData);
          
          
        }
      }
    }
    const end = moment();
    console.log("Migration done in ", end.diff(start, "seconds"));
  } catch (error) {
    console.error(error);
  }
};

// startMigrate();

const testCode = () => {
  const fileUrl = 'https://firebasestorage.googleapis.com/v0/b/e-pkwt-14644.appspot.com/o/sampleDocuments%2Fc9e7d74b-0f1e-4367-9d95-95b5ba4e56db.pdf?alt=media&token=12a31edf-adc0-49bd-b72a-8ca6207d455d';
  console.log(extractFilePath(fileUrl));
}

testCode();
