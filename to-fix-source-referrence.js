const { 
    dbDestination,
} = require('./config-connect');
const moment = require('moment');

const collectionName = 'generatedDocument'; // Replace with your collection name
const referenceFieldName = 'client'; // Replace with the name of the field containing the DocumentReference

async function updateDocumentReferences() {
  const snapshot = await dbDestination.collection(collectionName).get();
  console.log('Updating document ', snapshot.size);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const referenceValue = data[referenceFieldName];
    const valueToDebug = referenceValue._firestore._settings.projectId !== 'e-pkwt-6d0f0'
    if (valueToDebug) {
      console.log('referenceValue : ', valueToDebug);
    }

    // Check if the field exists and looks like an old project reference
    if (referenceValue && typeof referenceValue === 'string' && referenceValue.includes('e-pkwt-14644')) {
      console.log(`Processing document: ${doc.id}`);

      // Extract the document path within the old project
      const parts = referenceValue.split('/');
      // Assuming the path structure is consistent, adjust as needed
      const oldCollection = parts[parts.indexOf(collectionName) - 1]; // Adjust if 'tenagaKerja' is not the target collection
      const oldDocumentId = parts[parts.indexOf(collectionName) + 1]; // Adjust based on your path structure

      console.log(`Old Collection: ${oldCollection}, Old Document ID: ${oldDocumentId}`);

      // Construct the new DocumentReference in the current project
      const newReference = db.collection(oldCollection).doc(oldDocumentId);

      // Update the document in the new project
    //   await db.collection(collectionName).doc(doc.id).update({
    //     [referenceFieldName]: newReference,
    //   });

      console.log(`Updated ${referenceFieldName} in document ${doc.id} to: ${newReference.path}`);
    }
  }

  console.log('Finished updating document references.');
}

const main = async () => {
    try {
        const now = moment()
        console.log('start execution : ', now.toLocaleString());
        await updateDocumentReferences()

        const endTime = moment()
        console.log('end execution : ', endTime.toLocaleString());
        console.log('success in ', endTime.diff(now, 'seconds'), 'seconds')
    } catch (error) {
        throw error
    }
}

main().catch(err => console.log(err));