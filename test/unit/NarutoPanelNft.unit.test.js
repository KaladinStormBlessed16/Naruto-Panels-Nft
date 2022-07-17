const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Naruto Panels NFT Unit Tests", async function () {
          let narutoPanelsNft, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "narutopanels"])
              narutoPanelsNft = await ethers.getContract("NarutoPanels")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("constructor", () => {
              it("sets starting values correctly", async function () {
                  const tokenUriZero = await narutoPanelsNft.getSadTokenUrisClassS(0)
                  assert(tokenUriZero.includes("ipfs://"))
              })
          })

          describe("requestNft", () => {
              it("emits and event and kicks off a random word request", async function () {
                  await expect(narutoPanelsNft.requestNft()).to.emit(
                      narutoPanelsNft,
                      "NftRequested"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      narutoPanelsNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await narutoPanelsNft.tokenURI(0)
                              const tokenCounter = await narutoPanelsNft.getCurrentTokenIdCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse = await narutoPanelsNft.requestNft()
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              narutoPanelsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
      })
