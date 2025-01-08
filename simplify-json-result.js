const fs = require('fs');
const resultData = require('./exported/exported_data_tenagaKerja.json')
const collectionName = 'tenagaKerja'


const main = () => {
  const result = resultData.map(data => {
    const { id, nama, sumber, nik, perusahaan,...rest } = data
    return {
      id, nama, sumber, nik, perusahaan: perusahaan ? perusahaan._path.segments[1] : null
    }
  })

  fs.writeFileSync(`exported/simple_exported_data_${collectionName}.json`, JSON.stringify(result, null, 2));
}

main()