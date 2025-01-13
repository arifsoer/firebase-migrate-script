const admin = require('firebase-admin');
const fs = require('fs');

const perusahaanToMigrate = [
  'PT Gemah Ripa',
  'PT. Anugrah Cipta Lokatara',
  'PT. GKN',
  'PT.Indobaja'
]

const alreadyMigratedPerusahaan = [
  'PT Gemah Ripa',
  'PT. Anugrah Cipta Lokatara'
]

// Initialize Firebase Admin
const sourceProject = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'e-pkwt-14644'
}, 'source');

const destinationProject = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://',
  projectId: 'e-pkwt-6d0f0'
}, 'destination');

const dbSource = sourceProject.firestore();
const dbDestination = destinationProject.firestore();

// const collectionName = 'tenagaKerja'

// async function exportData() {
//   try {
//     const documents = await db.collection(collectionName).get();
//     const data = [];

//     documents.forEach(doc => {
//       data.push({ id: doc.id, ...doc.data() });
//     });

//     fs.writeFileSync(`exported/exported_data_${collectionName}.json`, JSON.stringify(data, null, 2));
//     console.log('Data exported successfully!');
//   } catch (error) {
//     console.error('Error exporting data:', error);
//   }
// }

// exportData();

/**
 * 
 * migrata data perusahaan
 * 
 * @param {admin.firestore.DocumentData} perusahaan 
 */
const migratePerusahaanData = async (perusahaan) => {
  const dataPerusahaan = perusahaan.data();
  console.log('start Migrate Perusahaan ', dataPerusahaan.nama);
  try {


  } catch (error) {
    console.error(error)
  }
}

const startMigrate = async () => {
  try {

    const getSourcePerusahaanList = await dbSource.collection('perusahaan').get();
    const getDestinationPerusahaanList = await dbDestination.collection('perusahaan').get();

    const existingPerusahaan = getDestinationPerusahaanList.docs.map(doc => doc.data().nama);

    for (let index = 0; index < getSourcePerusahaanList.docs.length; index++) {
      const doc = getSourcePerusahaanList.docs[index];
      const docData = doc.data();
      if (perusahaanToMigrate.includes(docData.nama)) {
        if (existingPerusahaan.includes(docData.nama)) {
          console.log('Perusahaan ', docData.nama, ' already migrated');
          
        } else {
          console.log('Perusahaan ', docData.nama, ' not migrated yet');
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

startMigrate()