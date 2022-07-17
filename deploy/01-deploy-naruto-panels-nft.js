const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")
const path = require("path")

const FUND_AMOUNT = "1000000000000000000000"
const baseImageRoute = "./images"
const metadataRoute = "./metadata"
const happyFolderCID = "QmXKUUz1G4Xy7AygLzsicSxEoQ1y6ZJNbfK3Rq9iBzQwx4"
const sadFolderCID = "QmZW4joJbZckSRcmJfeqUgNqVXs8aTTTPgM1njLJuW5pJA"
const metadataCID = "QmeJpwXjopcppDNMAqzFZvkYGiZYnv13n3J3QAi21Msmnw"
let sadTokenUrisClassS = [],
    sadTokenUrisClassA = [],
    sadTokenUrisClassB = [],
    happyTokenUrisClassS = [],
    happyTokenUrisClassA = [],
    happyTokenUrisClassB = []

const sadMetadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Sadness",
            value: 100,
        },
    ],
}
const happyMetadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Happiness",
            value: 100,
        },
    ],
}

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId

    await handleTokenUris(baseImageRoute)

    if (chainId == 31337) {
        // create VRFV2 Subscription
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("----------------------------------------------------")
    arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["callbackGasLimit"],
        sadTokenUrisClassS,
        sadTokenUrisClassA,
        sadTokenUrisClassB,
        happyTokenUrisClassS,
        happyTokenUrisClassA,
        happyTokenUrisClassB,
    ]
    let narutoPanelsNft
    if (sadTokenUrisClassS.length > 0 && happyTokenUrisClassS.length > 0) {
        narutoPanelsNft = await deploy("NarutoPanels", {
            from: deployer,
            args: arguments,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(narutoPanelsNft.address, arguments)
    }
}

async function handleTokenUris(imagesLocation) {
    let tokenUriMetadata = {}
    const fullImagesPath = path.resolve(imagesLocation)
    const baseFolders = fs.readdirSync(fullImagesPath)

    for (folder of baseFolders) {
        const typesFolders = fs.readdirSync(fullImagesPath + "/" + folder)
        for (typeFolder of typesFolders) {
            const files = fs.readdirSync(fullImagesPath + "/" + folder + "/" + typeFolder)
            for (file of files) {
                let CID = ""
                if (folder === "happy") {
                    CID = happyFolderCID
                    tokenUriMetadata = { ...happyMetadataTemplate }
                } else if (folder === "sad") {
                    CID = sadFolderCID
                    tokenUriMetadata = { ...sadMetadataTemplate }
                }
                tokenUriMetadata.name = file.split("_")[1].replace(".png", "")
                tokenUriMetadata.description = `The amazing ninja: ${tokenUriMetadata.name}, of Naruto Panels collection.`
                tokenUriMetadata.image = `ipfs://${CID}/${typeFolder}/${file}`

                const metadataFile = tokenUriMetadata.name + ".json"
                const jsonContent = JSON.stringify(tokenUriMetadata)
                if (fs.existsSync(metadataRoute + "/" + metadataFile)) {
                    if (folder === "happy") {
                        if (typeFolder === "S") {
                            happyTokenUrisClassS.push(`ipfs://${metadataCID}/${metadataFile}`)
                        } else if (typeFolder === "A") {
                            happyTokenUrisClassA.push(`ipfs://${metadataCID}/${metadataFile}`)
                        } else if (typeFolder === "B") {
                            happyTokenUrisClassB.push(`ipfs://${metadataCID}/${metadataFile}`)
                        }
                    } else if (folder === "sad") {
                        if (typeFolder === "S") {
                            sadTokenUrisClassS.push(`ipfs://${metadataCID}/${metadataFile}`)
                        } else if (typeFolder === "A") {
                            sadTokenUrisClassA.push(`ipfs://${metadataCID}/${metadataFile}`)
                        } else if (typeFolder === "B") {
                            sadTokenUrisClassB.push(`ipfs://${metadataCID}/${metadataFile}`)
                        }
                    }
                } else {
                    fs.writeFile(
                        metadataRoute + "/" + metadataFile,
                        jsonContent,
                        "utf8",
                        function (err) {
                            if (err) {
                                console.log("An error occured while writing JSON Object to File.")
                                return console.log(err)
                            }
                            console.log(`Uploading ${tokenUriMetadata.name}...`)
                        }
                    )
                }
            }
        }
    }
}

module.exports.tags = ["all", "narutopanels", "main"]
