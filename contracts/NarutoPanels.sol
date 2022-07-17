// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";

error NarutoPanels__RangeOutOfBounds();
error NarutoPanels__SenderAlreadyMinted();

contract NarutoPanels is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    enum NftClassB {
        KID_NARUTO,
        KID_SASUKE,
        KID_SAKURA,
        SHIKAMARU,
        ASUMA,
        ZABUZA,
        HAKU,
        HINATA,
        CHOJI,
        INO,
        MIZUKAGE,
        GAARA,
        KANKURO,
        TEMARI,
        LEE,
        NEJI,
        TENTEN,
        SHINO,
        SHIBA,
        SAI,
        HIDAN,
        DEIDARA,
        ZETSU,
        KONOHAMARU,
        KIMIMARO,
        LAST
    }

    enum NftClassA {
        KAKASHI,
        JIRAYA,
        TSUNADE,
        OROCHIMARU,
        OBITO,
        HIRUZEN,
        TOBIRAMA,
        SASUKE,
        NARUTO,
        SAKURA,
        DANZO,
        SHIZUI,
        NAGATO,
        PAIN,
        KAKUZU,
        KISAME,
        KILLER_BEE,
        RAIKAGE,
        TSUCHIKAGE,
        MAITO_GUY,
        LAST
    }

    enum NftClassS {
        MINATO,
        ITACHI,
        MADARA,
        HASHIRAMA,
        KAGUYA,
        LAST
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    string[] internal i_sadTokenUrisClassS;
    string[] internal i_sadTokenUrisClassA;
    string[] internal i_sadTokenUrisClassB;
    string[] internal i_happyTokenUrisClassS;
    string[] internal i_happyTokenUrisClassA;
    string[] internal i_happyTokenUrisClassB;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    mapping(uint256 => address) s_requestIdToSender;
    mapping(uint256 => uint256) s_tokenIdToModdedRng;
    mapping(address => bool) s_senderMinted;

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(uint256 tokenId, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[] memory sadTokenUrisClassS,
        string[] memory sadTokenUrisClassA,
        string[] memory sadTokenUrisClassB,
        string[] memory happyTokenUrisClassS,
        string[] memory happyTokenUrisClassA,
        string[] memory happyTokenUrisClassB
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Naruto Panels NFT", "NTP") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_sadTokenUrisClassS = sadTokenUrisClassS;
        i_sadTokenUrisClassA = sadTokenUrisClassA;
        i_sadTokenUrisClassB = sadTokenUrisClassB;
        i_happyTokenUrisClassS = happyTokenUrisClassS;
        i_happyTokenUrisClassA = happyTokenUrisClassA;
        i_happyTokenUrisClassB = happyTokenUrisClassB;
        _tokenIds.increment();
    }

    function requestNft() public returns (uint256 requestId) {
        if (s_senderMinted[msg.sender]) {
            revert NarutoPanels__SenderAlreadyMinted();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address nftOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = _tokenIds.current();

        _safeMint(nftOwner, newTokenId);
        uint256 moddedRng = randomWords[0] % 50;
        s_tokenIdToModdedRng[newTokenId] = moddedRng;
        s_senderMinted[nftOwner] = true;

        uint256 index = getNftTypeFromModdedRng(moddedRng);
        string memory tokenUri;
        if (index == 0) {
            tokenUri = i_sadTokenUrisClassS[
                uint256(NftClassS(moddedRng % uint256(NftClassS.LAST)))
            ];
        } else if (index == 1) {
            tokenUri = i_sadTokenUrisClassA[
                uint256(NftClassA(moddedRng % uint256(NftClassA.LAST)))
            ];
        } else {
            tokenUri = i_sadTokenUrisClassB[
                uint256(NftClassB(moddedRng % uint256(NftClassB.LAST)))
            ];
        }
        _setTokenURI(newTokenId, tokenUri);
        _tokenIds.increment();
        emit NftMinted(newTokenId, nftOwner);
    }

    function setHappyTokenURI(uint256 tokenId) public onlyOwner {
        uint256 moddedRng = s_tokenIdToModdedRng[tokenId];
        uint256 index = getNftTypeFromModdedRng(moddedRng);
        string memory tokenUri;
        if (index == 0) {
            tokenUri = i_happyTokenUrisClassS[
                uint256(NftClassS(moddedRng % uint256(NftClassS.LAST)))
            ];
        } else if (index == 1) {
            tokenUri = i_happyTokenUrisClassA[
                uint256(NftClassA(moddedRng % uint256(NftClassA.LAST)))
            ];
        } else {
            tokenUri = i_happyTokenUrisClassB[
                uint256(NftClassB(moddedRng % uint256(NftClassB.LAST)))
            ];
        }
        _setTokenURI(tokenId, tokenUri);
    }

    function getNftTypeFromModdedRng(uint256 moddedRng) public pure returns (uint256) {
        uint256 cumulativeSum = 0;
        uint8[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArray[i]) {
                return i;
            }
            cumulativeSum = cumulativeSum + chanceArray[i];
        }
        revert NarutoPanels__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint8[3] memory) {
        return [5, 25, 50];
    }

    function getSadTokenUrisClassS(uint256 index) public view returns (string memory) {
        return i_sadTokenUrisClassS[index];
    }

    function getSadTokenUrisClassA(uint256 index) public view returns (string memory) {
        return i_sadTokenUrisClassA[index];
    }

    function getSadTokenUrisClassB(uint256 index) public view returns (string memory) {
        return i_sadTokenUrisClassB[index];
    }

    function getHappyTokenUrisClassS(uint256 index) public view returns (string memory) {
        return i_happyTokenUrisClassS[index];
    }

    function getHappyTokenUrisClassA(uint256 index) public view returns (string memory) {
        return i_happyTokenUrisClassA[index];
    }

    function getHappyTokenUrisClassB(uint256 index) public view returns (string memory) {
        return i_happyTokenUrisClassB[index];
    }

    function getCurrentTokenIdCounter() public view returns (uint256) {
        return _tokenIds.current();
    }
}
