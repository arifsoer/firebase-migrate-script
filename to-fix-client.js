require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore, doc, Query } = require("firebase-admin/firestore");

// Note: The `punycode` module is deprecated. Ensure no implicit usage of `punycode` exists.
// If needed, replace with `punycode/ucs2` or another userland alternative.

let count = 1;

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

const dbDestination = getFirestore(
  destinationProject,
  process.env.DESTINATION_DB ?? "pkwt-prod-dev-temp"
);
const dbSource = getFirestore(
  sourceProject,
  process.env.SOURCE_DB ?? "default"
);

/**
 *
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaanDoc
 */
const toUpdateDataTK = async (perusahaanDoc) => {
  console.log("start update data tenaga kerja");
  const tenagaKerjas = await dbDestination
    .collection("tenagaKerja")
    .where("perusahaan", "==", perusahaanDoc.ref)
    .get();
  console.log("total tenagaKerja : ", tenagaKerjas.size);
  for (const tk of tenagaKerjas.docs) {
    const tkData = tk.data();
    if (tkData.docData) {
      const docDataClient = tkData.docData.client;
      if (docDataClient && docDataClient.perusahaan) {
        const perusahaanIdClient = docDataClient.perusahaan.id;
        if (perusahaanIdClient && perusahaanIdClient !== perusahaanDoc.id) {
          tkData.docData.client.perusahaan = perusahaanDoc.ref;
          console.log("count ", count++);
          await dbDestination
            .collection("tenagaKerja")
            .doc(tk.id)
            .update({
              docData: tkData.docData,
            });
          console.log("update client ", tk.id);
        }
      }
    }
  }
};

/**
 * 
 * @param {admin.firestore.QueryDocumentSnapshot} perusahaanDoc 
 */
const toUpdateGeneratedDoc = async (perusahaanDoc) => {
  console.log("start update generated document");
  const generatedDocuments = await dbDestination
    .collection("generatedDocument")
    .where("perusahaan", "==", perusahaanDoc.ref)
    .get();
  console.log("generatedDocuments ", generatedDocuments.size);

  for (const generatedDocument of generatedDocuments.docs) {
    const docData = generatedDocument.data();
    let isUpdate = false
    if (docData.docDataTk && docData.docDataTk.docData) {
      const docDataClient = docData.docDataTk.docData.client;
      if (docDataClient && docDataClient.perusahaan) {
        const perusahaanIdClient = docDataClient.perusahaan.id;
        if (perusahaanIdClient && perusahaanIdClient !== perusahaanDoc.id) {
          docData.docDataTk.docData.client.perusahaan = perusahaanDoc.ref;
          isUpdate = true
        }
      }
    }
    if (docData.dockDataClient) {
      if (docData.dockDataClient.perusahaan) {
        const perusahaanIdClient = docData.dockDataClient.perusahaan.id;
        if (perusahaanIdClient && perusahaanIdClient !== perusahaanDoc.id) {
          docData.dockDataClient.perusahaan = perusahaanDoc.ref;
          isUpdate = true
        }
      }
    }
    if (isUpdate) {
      console.log("count ", count++);
      await dbDestination
        .collection("generatedDocument")
        .doc(generatedDocument.id)
        .update({
          docDataTk: docData.docDataTk,
          dockDataClient: docData.dockDataClient,
        })
    }
  }
};

const toFixStatusPernikahan = async (perusahaanDoc) => {
  console.log("start update statusPernikahan");
  const statusPernikahan = await dbDestination
    .collection("statusPernikahan")
    .get();
  const statusPernikahanIds = statusPernikahan.docs.map(doc => doc.id);
  const statusPernikahanDocs = statusPernikahan.docs;

  // console.log('start check tenaga kerja')
  // const tenagaKerjas = await dbDestination.collection('tenagaKerja').where('perusahaan', '==', perusahaanDoc.ref).get();
  // for (const tenagaKerja of tenagaKerjas.docs) {
  //   const tkData = tenagaKerja.data();
  //   if (tkData.statusPernikahan && !statusPernikahanIds.includes(tkData.statusPernikahan.id)) {
  //     console.log('is status pernikahan not exist ', count++)
  //   }
  // }

  console.log('start check generated document')
  const tks = await dbDestination.collection('tenagaKerja').doc('Sgk6UWhmTqLkhs5uOBOr').get()
  // console.log(tks.ref);
  const generatedDocuments = await dbDestination.collection('generatedDocument').where('tenagaKerja', '==', tks.ref).get();
  console.log('generatedDocuments ', generatedDocuments.docs);
  for (const generatedDocument of generatedDocuments.docs) {
    const docData = generatedDocument.data();
    console.log(docData);
    // const docDataTk = docData.docDataTk;
    // if (docDataTk && docDataTk.docData && docDataTk.docData.statusPernikahan) {
    //   const statusPernikahanId = docDataTk.statusPernikahan.id;
    //   if (!statusPernikahanIds.includes(statusPernikahanId)) {
    //     console.log('is status pernikahan not exist ', count++)
    //   }
    // }
  }
}

const main = async () => {
  try {
    // to load perusahaan
    const perusahaan = await dbDestination
      .collection("perusahaan")
      .limit(1)
      .get();
    for (const doc of perusahaan.docs) {
      const docData = doc.data();
      console.log("perusahaan ", docData.nama);
      console.log("perusahaan Id ", doc.id);
      // await toUpdateDataTK(doc);
      // await toUpdateGeneratedDoc(doc);
      await toFixStatusPernikahan(doc);
    }

    console.log("Data Update successfully.");
  } catch (error) {
    console.error("Error loading data:", error);
  }
};

main();
