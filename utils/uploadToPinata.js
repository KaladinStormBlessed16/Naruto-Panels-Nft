const pinataSDK = require("@pinata/sdk")
const fs = require("fs")
const path = require("path")

const pinataApiKeyImg = process.env.PINATA_API_KEY_IMG || ""
const pinataApiSecretImg = process.env.PINATA_API_SECRET_IMG || ""
const pinataApiKeyJson = process.env.PINATA_API_KEY_JSON || ""
const pinataApiSecretJson = process.env.PINATA_API_SECRET_JSON || ""
const pinataImg = pinataSDK(pinataApiKeyImg, pinataApiSecretImg)
const pinataJson = pinataSDK(pinataApiKeyJson, pinataApiSecretJson)

async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath)
    let responses = []
    for (fileIndex in files) {
        // const readableStreamForFile = fs.createReadStream(`${fullImagesPath}`)
        try {
            const response = await pinataImg.pinFromFS(`${fullImagesPath}/${files[fileIndex]}`)
            responses.push(response)
        } catch (error) {
            console.log(error)
        }
    }
    return { responses, files }
}

async function storeTokenUriMetadata(metadata) {
    try {
        const response = await pinataJson.pinJSONToIPFS(metadata)
        return response
    } catch (error) {
        console.log(error)
    }
    return null
}

module.exports = { storeImages, storeTokenUriMetadata }
