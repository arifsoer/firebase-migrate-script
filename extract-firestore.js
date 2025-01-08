const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const dbSource = admin.firestore();

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

const startMigrate = async () => {
  try {
    const getCollectionList = await dbSource.listCollections();
    console.log('colection list ', getCollectionList)
  } catch (error) {
    console.error(error)
  }
}

startMigrate()