const { frontEndContractsFile, frontEndAbiFile } = require("../helper-hardhat-config")
const fs = require("fs")
const { network } = require("hardhat")

module.exports = async () => {
    console.log("Writing to front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end written!")
}

async function updateAbi() {
    const narutoPanelsNft = await ethers.getContract("NarutoPanels")
    fs.writeFileSync(
        frontEndAbiFile,
        narutoPanelsNft.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const narutoPanelsNft = await ethers.getContract("NarutoPanels")
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    if (network.config.chainId.toString() in contractAddresses) {
        if (
            !contractAddresses[network.config.chainId.toString()].includes(narutoPanelsNft.address)
        ) {
            contractAddresses[network.config.chainId.toString()] = [narutoPanelsNft.address]
        }
    } else {
        contractAddresses[network.config.chainId.toString()] = [narutoPanelsNft.address]
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}
module.exports.tags = ["all", "frontend"]
