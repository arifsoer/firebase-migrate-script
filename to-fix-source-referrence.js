const { dbDestination } = require("./config-connect");
const moment = require("moment");

const collectionName = "generatedDocument"; // Replace with your collection name
const referenceFieldName = "client"; // Replace with the name of the field containing the DocumentReference

async function updateDocumentReferences() {
  const snapshot = await dbDestination.collection(collectionName).get();
  console.log("Updating document ", snapshot.size);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const referenceValue = data[referenceFieldName];
    const valueToDebug =
      referenceValue._firestore._settings.projectId !== "e-pkwt-6d0f0";
    if (valueToDebug) {
      console.log("referenceValue : ", valueToDebug);
    }

    // Check if the field exists and looks like an old project reference
    if (
      referenceValue &&
      typeof referenceValue === "string" &&
      referenceValue.includes("e-pkwt-14644")
    ) {
      console.log(`Processing document: ${doc.id}`);

      // Extract the document path within the old project
      const parts = referenceValue.split("/");
      // Assuming the path structure is consistent, adjust as needed
      const oldCollection = parts[parts.indexOf(collectionName) - 1]; // Adjust if 'tenagaKerja' is not the target collection
      const oldDocumentId = parts[parts.indexOf(collectionName) + 1]; // Adjust based on your path structure

      console.log(
        `Old Collection: ${oldCollection}, Old Document ID: ${oldDocumentId}`
      );

      // Construct the new DocumentReference in the current project
      const newReference = db.collection(oldCollection).doc(oldDocumentId);

      // Update the document in the new project
      //   await db.collection(collectionName).doc(doc.id).update({
      //     [referenceFieldName]: newReference,
      //   });

      console.log(
        `Updated ${referenceFieldName} in document ${doc.id} to: ${newReference.path}`
      );
    }
  }

  console.log("Finished updating document references.");
}

const toUpdateGeneratedDocRefference = async () => {
  try {
    const sourceCollectionName = "generatedDocument";
    const snapshot = await dbDestination.collection(sourceCollectionName).get();

    for (const doc of snapshot.docs) {
      const idData = doc.id;
      const data = doc.data();

      const dataToUpdate = {};

      if (data.client) {
        const clientSegment = data.client._path.segments;
        const clientRef = dbDestination
          .collection(clientSegment[clientSegment.length - 2])
          .doc(clientSegment[clientSegment.length - 1]);
        dataToUpdate["client"] = clientRef;
      }

      if (data.tenagaKerja) {
        const tenagaKerjaSegment = data.tenagaKerja._path.segments;
        const tenagaKerjaRef = dbDestination
          .collection(tenagaKerjaSegment[tenagaKerjaSegment.length - 2])
          .doc(tenagaKerjaSegment[tenagaKerjaSegment.length - 1]);
        dataToUpdate["tenagaKerja"] = tenagaKerjaRef;
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await dbDestination
          .collection(sourceCollectionName)
          .doc(idData)
          .update(dataToUpdate);
      }
    }
    console.log("Update generated document successfully for : ", snapshot.size);
  } catch (error) {
    console.error("Error in update generated document:", error);
  }
};

const toUpdateTenagakerjDocRef = async () => {
  try {
    const sourceCollectionName = "tenagaKerja";
    const snapshots = await dbDestination
      .collection(sourceCollectionName)
      .get();

    for (const doc of snapshots.docs) {
      const idData = doc.id;
      const data = doc.data();

      if (data.statusPernikahan) {
        const statusPernikahanSegment = data.statusPernikahan._path.segments;
        const statusPernikahanRef = dbDestination
          .collection(
            statusPernikahanSegment[statusPernikahanSegment.length - 2]
          )
          .doc(statusPernikahanSegment[statusPernikahanSegment.length - 1]);

        await dbDestination
          .collection(sourceCollectionName)
          .doc(idData)
          .update({
            statusPernikahan: statusPernikahanRef,
          });
      }
    }
  } catch (error) {
    console.error("Error in update tenaga kerja document:", error);
  }
};

const toTestData = async () => {
  try {
    const sourceCollectionName = "statusPernikahan";
    const snapshots = await dbDestination
      .collection(sourceCollectionName)
      .get();

    const statusIds = snapshots.docs.map((doc) => doc.id);
    console.log("test data : ", statusIds);

    const tkCollectionName = "tenagaKerja";
    const snapshotsTk = await dbDestination.collection(tkCollectionName).get();

    for (const doc of snapshotsTk.docs) {
      const data = doc.data();

      // get data ref
      if (data.statusPernikahan) {
        const statusPernikahanSegment = data.statusPernikahan._path.segments;
        const statusPernikahanRef = dbDestination
          .collection(
            statusPernikahanSegment[statusPernikahanSegment.length - 2]
          )
          .doc(statusPernikahanSegment[statusPernikahanSegment.length - 1]);

        if (!statusIds.includes(statusPernikahanRef.id)) {
          console.log(
            "this id not in current statusPernikahan : ",
            statusPernikahanRef.id
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in update tenaga kerja document:", error);
  }
};

const toCheckNullEndData = async () => {
  try {
    const snapTk = await dbDestination
      .collection("tenagaKerja")
      .where("pkwtEndDate", "==", null)
      .get();

    for (const doc of snapTk.docs) {
      const data = doc.data();

      await dbDestination.collection("tenagaKerja").doc(doc.id).update({
        pkwtEndDate: data["createdAt"],
      });
      console.log('updated data for id ', doc.id)
    }
  } catch (error) {
    console.log("Error to check endDate ", error);
  }
};

const main = async () => {
  try {
    const now = moment();
    console.log("start execution : ", now.toLocaleString());
    // await toUpdateGeneratedDocRefference();
    // await toUpdateTenagakerjDocRef();
    // await toTestData();
    await toCheckNullEndData();

    const endTime = moment();
    console.log("end execution : ", endTime.toLocaleString());
    console.log("success in ", endTime.diff(now, "seconds"), "seconds");
  } catch (error) {
    throw error;
  }
};

main().catch((err) => console.log(err));
