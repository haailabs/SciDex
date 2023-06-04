//Web3 Init
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;
// Web3modal instance
let web3Modal;
// Chosen wallet provider given by the dialog window
let provider;
// Address of the selected account
let selectedAccount;
var accounts;
// Qualification NFTs
var NFT;
// Number of peer review requests
var numRequests;

/**
 * Setup Web3 utilities
 */
async function init() {
  console.log("WalletConnectProvider is", WalletConnectProvider);
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
      },
    },

    fortmatic: {
      package: Fortmatic,
      options: {
        key: "pk_test_391E26A3B43A3350",
      },
    },
  };

  web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
  });

  console.log("Web3Modal instance is", web3Modal);
}
var web3 = new Web3(window.ethereum);

/**
 * Main entry point.
 */
window.addEventListener("load", async () => {
  await init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  await onConnect();
});

//Contracts instanciation
const contract = new web3.eth.Contract(PeerReviewABI, PeerReviewAddress);
const tokenContract = new web3.eth.Contract(NFTABI, NFTAddress);
contract.setProvider(window.ethereum);
tokenContract.setProvider(window.ethereum);

// Check the NFT IDs owned by msg.sender
async function checkNFTs() {
  try {
    const ownedNFTs = [];
    const idArray = Array.from({ length: 23 }, (_, i) => i); // Creates an array of NFT IDs from 0 to 23
    const balanceArray = await tokenContract.methods
      .balanceOfBatch(Array(23).fill(window.ethereum.selectedAddress), idArray)
      .call(); // Retrieves the NFT balances for the selected address

    // Loops through the balance array and adds the IDs of the owned NFTs to the ownedNFTs array
    for (let i = 0; i < balanceArray.length; i++) {
      if (balanceArray[i] > 0) {
        ownedNFTs.push(i);
      }
    }

    console.log(`Owned NFT IDs: ${ownedNFTs}`);
    NFT = ownedNFTs;
  } catch (error) {
    console.error(error);
  }
}

//Get all by user and highlight corresponding requests
async function checkVotes() {
  // Request the votes from the server
  const response = await fetch("/votes/" + selectedAccount);
  if (!response.ok) {
    console.log(`Error fetching votes: HTTP ${response.status}`);
    return;
  }

  // Parse the response as JSON
  const votes = await response.json();

  // For each vote, find the corresponding score display element and highlight it
  for (let vote of votes) {
    const scoreDisplay = document.querySelector(`[data-index="s${vote.id}"]`);
    if (scoreDisplay) {
      // Highlight the score display by setting its color to red
      scoreDisplay.style.color = "var(--active-color)";
    }

    // Highlight the corresponding upvote or downvote button
    if (parseInt(vote.vote) == 1) {
      const upvoteButton = document.querySelector(`[data-index="u${vote.id}"]`);

      upvoteButton.style.color = "var(--active-color)";
    } else if (parseInt(vote.vote) == -1) {
      const downvoteButton = document.querySelector(
        `[data-index="d${vote.id}"]`
      );

      downvoteButton.style.color = "var(--active-color)";
    }
  }
}

/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {
  // Get a Web3 instance for the wallet
  const web3 = new Web3(provider);
  console.log("Web3 instance is", web3);

  let chainId = await web3.eth.net.getId();

  // Load chain information over an HTTP API
  const chainData = evmChains.getChain(chainId);

  // Get list of accounts of the connected wallet
  accounts = await web3.eth.getAccounts();

  // MetaMask does not give you all accounts, only the selected account
  console.log("Got accounts", accounts);
  selectedAccount = accounts[0];

  //Check NFTs
  await checkNFTs();

  // Check Votes
  await checkVotes();
  // document.querySelector("#network-name").textContent = chainData.name;
  // document.querySelector("#selected-account").textContent = selectedAccount.substring(0, 5) + "..." + selectedAccount.substr(selectedAccount.length - 4, 4);

  // Display fully loaded UI for wallet data
  prepareDiv = document.querySelectorAll(".prepare");
  prepareDiv.forEach((el) => (el.style.display = "none"));
  connectedDiv = document.querySelectorAll(".connected");
  connectedDiv.forEach((el) => (el.style.display = "block"));
  userAddress = document.getElementById("user");
  userAddress.textContent =
    selectedAccount.substring(0, 5) +
    "..." +
    selectedAccount.substr(selectedAccount.length - 4, 4);
  document.querySelector("#qualification").style.display = "none";
  document.querySelector("#review-area").style.display = "block";
}

async function refreshAccountData() {
  // If any current data is displayed when
  // the user is switching acounts in the wallet
  // immediate hide this data
  prepareDiv = document.querySelectorAll(".prepare");
  prepareDiv.forEach((el) => (el.style.display = "none"));

  connectedDiv = document.querySelectorAll(".connected");
  connectedDiv.forEach((el) => (el.style.display = "block"));
  document.querySelector("#qualification").style.display = "none";
  document.querySelector("#review-area").style.display = "block";

  // Disable button while UI is loading.
  // fetchAccountData() will take a while as it communicates
  // with Ethereum node via JSON-RPC and loads chain data
  // over an API call.

  await fetchAccountData(provider);
}

async function onConnect() {
  console.log("Opening a dialog", web3Modal);
  try {
    provider = await web3Modal.connect();
  } catch (e) {
    console.log("Could not get a wallet connection", e);
  }

  chainId = await web3.eth.net.getId();

  // Subscribe to accounts change
  provider.on("accountsChanged", (accounts) => {
    (async () => {
      await fetchAccountData();
    })();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    (async () => {
      await fetchAccountData();
    })();
  });

  // Subscribe to chainId change
  provider.on("networkChanged", (chainId) => {
    (async () => {
      await fetchAccountData();
    })();
  });

  await refreshAccountData();
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {
  console.log("Killing the wallet connection", provider);

  // TODO: Which providers have close method?
  if (provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  prepareDiv = document.querySelectorAll(".prepare");
  prepareDiv.forEach((el) => (el.style.display = "block"));
  connectedDiv = document.querySelectorAll(".connected");
  connectedDiv.forEach((el) => (el.style.display = "none"));
  document.getElementById("review-area").style.display = "none";
  document.getElementById("qualification").style.display = "block";

  // Get all elements with the  scoringclasses and reset their color
  let upvoteButtons = document.getElementsByClassName("fa fa-arrow-up");
  let downvoteButtons = document.getElementsByClassName("fa fa-arrow-down");
  let scoreDisplays = document.getElementsByClassName("scoreDisplay");

  for (let button of upvoteButtons) {
    button.style.color = "var(--highlight)";
  }

  for (let button of downvoteButtons) {
    button.style.color = "var(--highlight)";
  }

  for (let score of scoreDisplays) {
    score.style.color = "var(--highlight)";
  }
}

document.getElementById("logout").addEventListener("click", onDisconnect);

//Check wallet connection
async function checkWalletConnection() {
  if (!window.ethereum) {
    // Wallet is not installed
    console.log("No wallet installed");
    await onInstall();
  } else {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length === 0) {
        // Wallet is not connected
        console.log("No wallet connected");
        await onConnect();
      } else {
        // Wallet is connected
        console.log(`Connected to wallet with address ${accounts[0]}`);

        // Listen for accountsChanged event
        window.ethereum.on("accountsChanged", (newAccounts) => {
          if (newAccounts.length === 0) {
            // Wallet is disconnected
            console.log("Wallet disconnected");
            onDisconnect();
          } else {
            // Wallet is connected with a new account
            console.log(`Connected to wallet with address ${newAccounts[0]}`);
            onConnect();
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

//SHA256
async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);

  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

var hash;
//PDF Upload script begins here

var label = document.querySelector('label[for="fileInput"]');
var fileInput = document.getElementById("fileInput");

label.ondragover = function (e) {
  e.preventDefault();
  this.style.borderColor = "blue";
};

label.ondragleave = function () {
  this.style.borderColor = "";
};

label.ondrop = function (e) {
  e.preventDefault();
  this.style.borderColor = "";

  if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      if (e.dataTransfer.items[i].kind === "file") {
        var file = e.dataTransfer.items[i].getAsFile();
        fileInput.files = e.dataTransfer.files;

        // manually trigger the onchange event
        fileInput.onchange();
      }
    }
  } else {
    alert("Failed to upload file. Please try again.");
  }
};

fileInput.onchange = async () => {
  if (fileInput.files.length === 0) {
    alert("Please choose a PDF file");
    return;
  }

  let file = fileInput.files[0];

  if (file.type != "application/pdf") {
    alert("Please choose a PDF file");
  } else {
    // Your existing upload code...
  }
};

document.getElementById("fileInput").onchange = async () => {
  let fileElement = document.getElementById("fileInput");

  // check if user had selected a file
  if (fileElement.files.length === 0) {
    alert("please choose a PDF file");
    return;
  }

  let file = fileElement.files[0];

  if (file.type != "application/pdf") {
    alert("Please choose a PDF file");
  } else {
    hash = await sha256(file);
    document.querySelector("#details").style.display = "block";
    const response = await axios.get("/HIP/getLatestId");
    const numRequests = response.data;
    let formData = new FormData();
    formData.append("file", file, numRequests + ".pdf");

    axios
      .post("/upload-single-file", formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`upload process: ${percentCompleted}%`);
        },
      })
      .then((res) => {
        console.log(res.data);
        console.log(res.data.url);
      });
  }
};
document.getElementById("modal-hide").onclick = function () {
  document.getElementById("details").style.display = "none";
  document.getElementById("fileInput").value = null;
};

var numProposers;

//Deleting a review
async function deleteReview(id, responseNum) {
  try {
    const response = await axios.delete(`/REVIEW/${id}/${responseNum}`);
    console.log(response.data);
  } catch (error) {
    console.error("Error in axios.delete:", error);
  }
}

// Submitting a review
async function submitReview(
  contract,
  c,
  index,
  responseValue,
  responseHash,
  problem,
  review
) {
  try {
    // Show the animation
    showAnimation();
    var resp = {
      id: index,
      responseNum: problem[2],
      review: review.value,
      recommendation: responseValue,
    };

    console.log("Before axios.post");
    axios
      .post("/REVIEW", resp)
      .then(async (res) => {
        console.log(res.data);

        console.log("Before contract method call");
        const result = await contract.methods
          .submitResponse(c[0], index, responseValue, "0x" + responseHash)
          .send({ from: accounts[0] });

        console.log(result);

        if (result.transactionHash) {
          await incrementNumReviews(index);
          await incrementReviewerCount(accounts[0]);
          num = document.querySelector(".app-number");
          num.innerHTML = parseInt(problem[2]) + 1;

          await displayReviews(index);
          // Hide the animation
          hideAnimation();
        } else {
          console.error("Transaction receipt not found");
          deleteReview(index, problem[2]);
          // Hide the animation
          hideAnimation();
        }
      })
      .catch((error) => {
        console.error("Error in axios.post:", error);
        // Hide the animation
        hideAnimation();
      });
  } catch (error) {
    console.error("Error in contract.methods.submitResponse:", error);
    deleteReview(index, problem[2]);
    // Hide the animation
    hideAnimation();
  }
}

//Deleting a database record
async function deleteRecord(id) {
  try {
    const response = await axios.delete(`/HIP/${id}`);
    console.log(response.data);
  } catch (error) {
    console.error("Error in axios.delete:", error);
  }
}
async function castVote(index, ethereumAddress, vote) {
  try {
    const response = await fetch("/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: index,
        ethereumAddress: ethereumAddress,
        vote: vote,
      }),
    });

    // If the response is ok, read the body as text
    if (response.ok) {
      const responseText = await response.text();

      if (responseText === "Vote already recorded!") {
        console.log("You have already cast this vote.");
      } else if (responseText === "Vote recorded successfully!") {
        console.log("Your vote was recorded successfully!");

        // Unhighlight all elements (score, upvote, and downvote button)
        let scoreDisplay = document.querySelector(`[data-index="s${index}"]`);
        let upvoteButton = document.querySelector(`[data-index="u${index}"]`);
        let downvoteButton = document.querySelector(`[data-index="d${index}"]`);

        // Reset the color for all elements
        scoreDisplay.style.color = "var(--highlight)";
        upvoteButton.style.color = "var(--highlight)";
        downvoteButton.style.color = "var(--highlight)";

        // Increment or decrement the score
        let currentScore = parseInt(scoreDisplay.textContent);
        currentScore += vote; // assuming 'vote' is either 1 (for upvote) or -1 (for downvote)
        scoreDisplay.textContent = currentScore.toString();

        // Highlight the score
        scoreDisplay.style.color = "var(--active-color)";

        // Highlight the corresponding upvote or downvote button
        if (parseInt(vote) == 1) {
          upvoteButton.style.color = "initial";
          upvoteButton.style.color = "var(--active-color)";
        } else if (parseInt(vote) == -1) {
          downvoteButton.style.color = "var(--active-color)";
        }
      }
    } else {
      console.error(
        `Error casting vote: HTTP error! status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error casting vote:", error);
  }
}

//HIP submission script begins here
document
  .getElementById("submitHIPButton")
  .addEventListener("click", async (f) => {
    await fetchAccountData();

    let title = document.getElementById("title").value;

    let abstract = document.getElementById("abstract").value;
    let request = document.getElementById("request").value;
    let DID = document.getElementById("data").value;
    let creationDate = await web3.eth.getBlock("latest");
    creationDate = creationDate.timestamp;
    let bounty = web3.utils.toWei(
      document.getElementById("bounty").value,
      "ether"
    );

    let responseHash = await sha256(request);
    let duration = Number(document.getElementById("duration").value) * 86400;
    let specialties = 0;
    var options = document.getElementById("select-role").selectedOptions;
    var values = Array.from(options).map(({ value }) => value);

    for (i = 0; i < values.length; i++) {
      specialties += Math.pow(2, values[i]);
    }

    try {
      const response = await axios.get("/HIP/getLatestId");
      const numRequests = response.data;
      // Show the animation
      showAnimation();

      var doc = {
        id: numRequests,
        proposer: accounts[0],
        pdf: "0x" + hash,
        response: request,
        title: title,
        abstract: abstract,
        bounty: bounty,
        numReviews: "0",
        specs: specialties,
        date: creationDate,
        duration: duration,
        DID: DID,
      };
      const data = doc;

      axios
        .post("/HIP", data)
        .then(async (res) => {
          console.log(res.data);

          await contract.methods
            .submitHIP(
              duration,
              "0x" + hash,
              "0x" + responseHash,
              specialties,
              bounty,
              numRequests
            )
            .send({ from: accounts[0], value: bounty })
            .then((result) => {
              console.log(result);
              // Hide the animation
              hideAnimation();

              refresh();
              document.getElementById("details").style.display = "none";
            })
            .catch((error) => {
              // Hide the animation
              hideAnimation();
              console.error("Error in contract.methods.submitHIP:", error);
              deleteRecord(numRequests);
            });
        })
        .catch((error) => {
          // Hide the animation
          hideAnimation();
          console.error("Error in axios.post:", error);
        });
    } catch (error) {
      // Hide the animation
      hideAnimation();
      console.error("Error fetching the latest document id:", error);
    }
  });

var db;
var numProposers;

//Common specialties between reviewer and manuscript
function findCommonElements(manuscriptSpecs, NFT) {
  const commonElements = [];

  for (let i = 0; i < manuscriptSpecs.length; i++) {
    if (NFT.includes(manuscriptSpecs[i])) {
      commonElements.push(manuscriptSpecs[i]);
      break;
    }
  }

  return commonElements;
}
//Refresh list of HIPs
async function refresh() {
  /**
  numRequests = await contract.methods.getNumHIPs().call();
  */
  document.getElementById("loading").innerHTML = "Loading on-chain data...";
  let HIPcount = 0;
  /**
  await axios.get('./db.json')
    .then((response) => {
      db = response.data

    });
*/
  await axios.post("/getMyJSON").then((response) => {
    db = response.data;
  });

  //Getting data from the contract
  numHIPs = db.length;
  const board = document.getElementById("board");
  const sideboard = document.getElementById("sideboard");
  board.innerHTML = "";
  sideboard.innerHTML = "";
  //Counting the number of HIPs in each specialty
  let specCount = new Array(23).fill(0);
  for (var i = 0; i < numHIPs; i++) {
    HIPcount++;
    let div = document.createElement("div");
    div.id = i;
    div.className = "job-card";
    let header = document.createElement("div");
    header.className = "job-card-header";
    let tag = createTagElement(toColor(db[i].title));

    let score = document.createElement("div");
    score.className = "scoreDiv";

    // Create the upvote button with Font Awesome icon
    const upvoteButton = document.createElement("button");
    upvoteButton.setAttribute("data-index", "u" + i);
    const upvoteIcon = document.createElement("i");
    upvoteIcon.classList.add("fa", "fa-arrow-up");
    upvoteButton.appendChild(upvoteIcon);
    // Attach an event listener to the upvote button
    upvoteButton.addEventListener("click", async function () {
      // Retrieve 'i' from the 'data-index' attribute of 'this' (the button)
      const index = this.getAttribute("data-index").substring(1);

      // Check if the wallet is connected
      if (accounts.length === 0) {
        console.log("No wallet connected");
        // Connect the wallet
        await onConnect(); // Replace this with your function to connect the wallet
      }

      if (accounts.length > 0) {
        console.log(`Connected to wallet with address ${accounts[0]}`);
        // Upvote the item at index 'i' in the 'HIP' database
        // This assumes that 'castVote' is a function that takes an index, a wallet address, and a vote (+1 for upvote, -1 for downvote)
        await castVote(index, accounts[0], 1); // Replace 'castVote' with your function to send the vote to the server
      }
    });
    score.appendChild(upvoteButton);
    // Create the score display
    const scoreDisplay = document.createElement("span");
    scoreDisplay.classList.add("scoreDisplay");
    scoreDisplay.textContent = db[i].score;
    scoreDisplay.setAttribute("data-index", "s" + i);
    score.appendChild(scoreDisplay);

    // Create the downvote button with Font Awesome icon
    const downvoteButton = document.createElement("button");
    downvoteButton.setAttribute("data-index", "d" + i);
    const downvoteIcon = document.createElement("i");
    downvoteIcon.classList.add("fa", "fa-arrow-down");
    downvoteButton.appendChild(downvoteIcon);
    // Attach an event listener to the downvote button
    downvoteButton.addEventListener("click", async function () {
      // Retrieve 'i' from the 'data-index' attribute of 'this' (the button)
      const index = this.getAttribute("data-index").substring(1);

      // Check if the wallet is connected
      if (accounts.length === 0) {
        console.log("No wallet connected");
        // Connect the wallet
        await onConnect(); // Replace this with your function to connect the wallet
      }

      if (accounts.length > 0) {
        console.log(`Connected to wallet with address ${accounts[0]}`);
        // Downvote the item at index 'i' in the 'HIP' database
        // This assumes that 'castVote' is a function that takes an index, a wallet address, and a vote (+1 for upvote, -1 for downvote)
        await castVote(index, accounts[0], -1); // Replace 'castVote' with your function to send the vote to the server
      }
    });
    score.appendChild(downvoteButton);
    header.appendChild(score);
    header.appendChild(tag);

    let title = document.createElement("div");
    title.className = "job-card-title";
    title.innerHTML = db[i].title;
    title.id = db[i].numReviews;
    header.appendChild(title);
    let subtitle = document.createElement("div");
    subtitle.className = "job-card-subtitle";
    subtitle.innerHTML = db[i].response;
    let specialties = document.createElement("div");
    specialties.className = "job-detail-buttons";
    let s = parseInt(db[i].specs);
    for (let k = 0; k < 23; k++) {
      if ((s >> k) & (1 != 0)) {
        let spec = document.createElement("button");
        spec.className = "search-buttons detail-button";
        spec.innerHTML = specs[k];
        spec.id = k;
        //Incrementing the count for the specialty
        specCount[k]++;
        specialties.appendChild(spec);
      }
    }
    let buttons = document.createElement("div");
    buttons.className = "job-card-buttons";
    let button1 = document.createElement("button");
    button1.className = "search-buttons card-buttons";
    button1.innerHTML = "Review";
    let button2 = document.createElement("button");
    var a = document.createElement("a");
    a.href = "./uploads/" + i + ".pdf";
    a.target = "_blank";
    a.className = "search-buttons card-buttons-msg";
    a.innerHTML = '<i class="fa fa-download"></i> Dowload PDF';
    buttons.style.textAlign = "center";
    buttons.appendChild(button1);
    buttons.appendChild(a);
    const commentIcon = document.createElement("i");
    commentIcon.classList.add("fa", "fa-comment");

    let numRev = document.createElement("p");
    numRev.classList.add("numIcon");
    numRev.style.fontSize = "12px";
    numRev.classList.add("numRev");
    numRev.innerHTML = ` ${db[i].numReviews} reviews`;

    numRev.prepend(commentIcon);

    const prizeIcon = document.createElement("i");
    prizeIcon.classList.add("fa", "fa-money");

    let bountyValue = document.createElement("p");
    bountyValue.classList.add("numIcon");
    bountyValue.classList.add("bountyValue");
    bountyValue.style.fontSize = "12px";

    const ethValue = db[i].bounty / 10 ** 18;
    const maxChars = 1;
    const decimalPlaces = Math.max(
      0,
      maxChars - Math.floor(Math.log10(ethValue)) - 1
    );
    const ethValueFormatted = ethValue.toFixed(decimalPlaces);
    bountyValue.innerHTML = ` ${ethValueFormatted} MATIC`;

    bountyValue.prepend(prizeIcon);

    const hourglassIcon = document.createElement("i");
    hourglassIcon.classList.add("fa", "fa-hourglass");

    let timeLeft = document.createElement("p");
    timeLeft.classList.add("numIcon");
    timeLeft.classList.add("timeLeft");
    timeLeft.style.fontSize = "12px";

    function convertUnixTime(unixSeconds) {
      const days = Math.floor(unixSeconds / (24 * 60 * 60));
      const hours = Math.floor((unixSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((unixSeconds % (60 * 60)) / 60);
      const seconds = Math.floor(unixSeconds % 60);

      let result = "";
      if (days > 0) {
        result += `${days} day${days > 1 ? "s" : ""}`;
      } else if (hours > 0) {
        result += `${hours} hour${hours > 1 ? "s" : ""}`;
      } else if (minutes > 0) {
        result += `${minutes} minute${minutes > 1 ? "s" : ""}`;
      } else if (seconds > 0) {
        result += `${seconds} second${seconds > 1 ? "s" : ""}`;
      } else {
        result = "Closed";
      }

      return result;
    }

    let currentBlock;

    // Get the latest block details
    if (web3.currentProvider) {
      currentBlock = await web3.eth.getBlock("latest");

      if (typeof currentBlock === "undefined") {
        timeLeft.innerHTML = "Unknown";
      } else {
        currentBlock = currentBlock.timestamp;

        timeLeft.innerHTML =
          " " +
          convertUnixTime(
            -parseInt(currentBlock) +
              parseInt(db[i].date) +
              parseInt(db[i].duration)
          );
      }
    } else {
      timeLeft.innerHTML = " No wallet";
    }
    timeLeft.prepend(hourglassIcon);
    const iconsContainer = document.createElement("div");
    iconsContainer.classList.add("icons-container");
    iconsContainer.appendChild(timeLeft);
    iconsContainer.appendChild(bountyValue);
    iconsContainer.appendChild(numRev);
    header.appendChild(title);
    div.appendChild(header);

    div.appendChild(subtitle);
    div.appendChild(iconsContainer);
    div.appendChild(specialties);

    div.appendChild(buttons);
    board.insertBefore(div, board.children[0]);

    // Create a new job overview card element
    const jobOverviewCard = document.createElement("div");
    jobOverviewCard.classList.add("job-overview-card");
    sideboard.insertBefore(jobOverviewCard, sideboard.children[0]);
    // Create the inner elements and append them to the job overview card element
    const jobCard = document.createElement("div");
    jobCard.id = i;
    jobCard.classList.add("job-card", "overview-card");
    jobOverviewCard.appendChild(jobCard);

    const overviewWrapper = document.createElement("div");
    overviewWrapper.classList.add("overview-wrapper");
    jobCard.appendChild(overviewWrapper);

    var svg = tag.cloneNode(true);
    overviewWrapper.appendChild(svg);

    const overviewDetail = document.createElement("div");
    overviewDetail.classList.add("overview-detail");
    overviewWrapper.appendChild(overviewDetail);

    const jobCardTitle = title.cloneNode(true);
    jobCardTitle.classList.add("job-card-title");
    overviewDetail.appendChild(jobCardTitle);

    const jobCardSubtitle = subtitle.cloneNode(true);
    jobCardSubtitle.classList.add("job-card-subtitle");
    overviewDetail.appendChild(jobCardSubtitle);

    const jobOverviewButtons = specialties.cloneNode(true);
    jobOverviewButtons.classList.add("job-overview-buttons");
    jobCard.appendChild(jobOverviewButtons);

    const jobCards = document.querySelectorAll(".job-card");
    const logo = document.querySelector(".logo");
    const jobLogos = document.querySelector(".job-logos");
    const jobDetailTitle = document.querySelector(
      ".job-explain-content .job-card-title"
    );
    const jobBg = document.querySelector(".job-bg");

    //To view details when clicking on card from the front page
    button1.addEventListener("click", async () => {
      index = parseInt(div.id);
      const logo = div.querySelector("svg");
      let b = toColor(db[index].title);
      console.log(b);

      jobBg.style.background = `repeating-linear-gradient(
  45deg,
  ${b},
  ${b} 10%,
  ${"var(--active-light-color)"} 10%,
  ${"var(--active-light-color)"} 20%
)`;
      const title = div.querySelector(".job-card-title");
      const abstract = document.querySelector(".overview-text-subheader");
      const author = document.querySelector(".company-name");
      const DID = document.querySelector("#medcred-value");
      if (db[index].DID != "") {
        const link = document.createElement("a");
        link.href = db[index].DID;
        link.target = "_blank";
        link.textContent = "Open";
        link.style.color = "var(--active-color)";
        DID.innerHTML = "";
        DID.appendChild(link);
      } else {
        DID.removeChild(DID.firstChild);
        DID.innerHTML = "-";
      }
      let currentBlock;
      // Get the latest block details
      if (web3.currentProvider) {
        currentBlock = await web3.eth.getBlock("latest");
        if (typeof currentBlock === "undefined") {
          document.querySelector("#deadline-value").innerHTML = "Unknown";
        } else {
          currentBlock = currentBlock.timestamp;
          document.querySelector("#deadline-value").innerHTML = convertUnixTime(
            -parseInt(currentBlock) +
              parseInt(db[index].date) +
              parseInt(db[index].duration)
          );
        }
      } else {
        document.querySelector("#deadline-value").innerHTML = " No wallet";
      }
      if (web3.currentProvider) {
        const since = document.querySelector(".since");
        since.innerHTML =
          "Posted " +
          convertUnixTime(parseInt(currentBlock) - parseInt(db[index].date)) +
          " ago";
      }
      author.innerHTML =
        db[index].proposer.substring(0, 5) +
        "..." +
        db[index].proposer.substr(db[index].proposer.length - 4, 4);
      abstract.innerHTML = db[index].abstract;
      const downloadPDF = document.querySelector(".downloadPDF");
      downloadPDF.href = "./uploads/" + index + ".pdf";

      downloadPDF.target = "_blank";
      const request = document.querySelector(".overview-text-request");
      request.innerHTML = db[index].response;
      jobDetailTitle.textContent = title.textContent;
      jobLogos.innerHTML = logo.outerHTML;
      wrapper.classList.add("detail-page");
      wrapper.scrollTop = 0;
      num = document.querySelector(".app-number");

      num.innerHTML = db[index].numReviews;

      num.id = index;
      bountyValue = document.querySelector("#bounty-value");
      bountyValue.innerHTML = parseInt(db[index].bounty) / 10 ** 18 + " MATIC";
      await displayReviews(index);

      if (
        web3.currentProvider &&
        web3.currentProvider.isConnected() &&
        accounts
      ) {
        let oldButton = document.getElementById("submit-review-button");
        // Select the parent element that contains the button
        const parentElement = document.getElementById("review-area");
        parentElement.style.display = "block";
        document.querySelector("#qualification").style.display = "none";
        parentElement.removeChild(oldButton);
        submitReviewButton = document.createElement("button");
        submitReviewButton.id = "submit-review-button";
        submitReviewButton.className = "search-buttons card-buttons"; // Add the appropriate class names
        submitReviewButton.innerText = "Submit";

        submitReviewButton.addEventListener("click", async function () {
          await checkWalletConnection();
          //Wallet should now be connected

          console.log("Wallet connected:", window.ethereum.selectedAddress);
          problem = await contract.methods.HIPIndex(index).call();
          let manuscriptSpecs = [];
          s = problem[5];
          console.log(s);
          for (let k = 0; k < 23; k++) {
            if ((s & (1 << k)) != 0) {
              manuscriptSpecs.push(k);
            }
          }
          console.log("manuscriptSpecs:", manuscriptSpecs);
          console.log(manuscriptSpecs);
          console.log(NFT);
          let c = findCommonElements(manuscriptSpecs, NFT);

          if (c.length === 0) {
            alert(
              "Qualification NFT Needed: You are unable to Review this Manuscript. "
            );
          } else {
            let selectElement = document.getElementById("recommendation");
            let review = document.getElementById("review");
            let responseValue = selectElement.value;
            let responseHash = await sha256(review.value);
            console.log("specialty", c[0]);
            console.log("index", index);
            console.log("responseValue", responseValue);
            console.log("hash", "0x" + responseHash);
            submitReview(
              contract,
              c,
              index,
              responseValue,
              responseHash,
              problem,
              review
            );
          }
        });
        // Add the new button to the parent element
        parentElement.appendChild(submitReviewButton);
      } else {
        document.getElementById("review-area").display = "none";
        document.getElementById("qualification").display = "block";
      }
    });

    //To view details when clicking on card from the inner list
    jobCard.addEventListener("click", async () => {
      let index = parseInt(div.id);
      const logo = div.querySelector("svg");
      let b = toColor(db[index].title);
      console.log(b);

      jobBg.style.background = `repeating-linear-gradient(
  45deg,
  ${b},
  ${b} 10%,
  ${"var(--active-light-color)"} 10%,
  ${"var(--active-light-color)"} 20%
)`;

      const title = div.querySelector(".job-card-title");
      const abstract = document.querySelector(".overview-text-subheader");
      const author = document.querySelector(".company-name");
      const DID = document.querySelector("#medcred-value");
      if (db[index].DID != "") {
        const link = document.createElement("a");
        link.href = db[index].DID;
        link.target = "_blank";
        link.textContent = "Open";
        link.style.color = "var(--active-color)";
        DID.innerHTML = "";
        DID.appendChild(link);
      } else {
        DID.removeChild(DID.firstChild);
        DID.innerHTML = "-";
      }
      let currentBlock;
      // Get the latest block details
      if (web3.currentProvider && web3.currentProvider.isConnected()) {
        currentBlock = await web3.eth.getBlock("latest");
        if (typeof currentBlock === "undefined") {
          document.querySelector("#deadline-value").innerHTML = "Unknown";
        } else {
          currentBlock = currentBlock.timestamp;

          document.querySelector("#deadline-value").innerHTML = convertUnixTime(
            -parseInt(currentBlock) +
              parseInt(db[index].date) +
              parseInt(db[index].duration)
          );
        }
      } else {
        document.querySelector("#deadline-value").innerHTML = " No wallet";
      }
      if (web3.currentProvider) {
        const since = document.querySelector(".since");
        since.innerHTML =
          "Posted " +
          convertUnixTime(parseInt(currentBlock) - parseInt(db[index].date)) +
          " ago";
      }

      document.querySelector(".existing-reviews").innerHTML = ""; // Clear the existing content
      author.innerHTML =
        db[index].proposer.substring(0, 5) +
        "..." +
        db[index].proposer.substr(db[index].proposer.length - 4, 4);
      abstract.innerHTML = db[index].abstract;
      downloadPDF = document.querySelector(".downloadPDF");
      downloadPDF.href = "./uploads/" + index + ".pdf";

      downloadPDF.target = "_blank";
      const request = document.querySelector(".overview-text-request");
      request.innerHTML = db[index].response;
      jobDetailTitle.textContent = title.textContent;
      jobLogos.innerHTML = logo.outerHTML;
      wrapper.classList.add("detail-page");
      wrapper.scrollTop = 0;
      num = document.querySelector(".app-number");

      num.innerHTML = db[index].numReviews;
      num.id = index;

      await displayReviews(index);

      if (
        web3.currentProvider &&
        web3.currentProvider.isConnected() &&
        accounts
      ) {
        document.getElementById("qualification").style.display = "none";
        let oldButton = document.getElementById("submit-review-button");
        // Select the parent element that contains the button
        const parentElement = document.getElementById("review-area");
        parentElement.style.display = "block";
        parentElement.removeChild(oldButton);
        submitReviewButton = document.createElement("button");
        submitReviewButton.id = "submit-review-button";
        submitReviewButton.className = "search-buttons card-buttons"; // Add the appropriate class names
        submitReviewButton.innerText = "Submit";

        submitReviewButton.addEventListener("click", async function () {
          await checkWalletConnection();
          //Wallet should now be connected

          console.log("Wallet connected:", window.ethereum.selectedAddress);
          problem = await contract.methods.HIPIndex(index).call();
          let manuscriptSpecs = [];
          s = problem[5];
          console.log(s);
          for (let k = 0; k < 23; k++) {
            if ((s & (1 << k)) != 0) {
              manuscriptSpecs.push(k);
            }
          }
          console.log("manuscriptSpecs:", manuscriptSpecs);
          console.log(manuscriptSpecs);
          console.log(NFT);
          let c = findCommonElements(manuscriptSpecs, NFT);

          if (c.length === 0) {
            alert(
              "Qualification NFT Needed: You are unable to Review this Manuscript. "
            );
          } else {
            let selectElement = document.getElementById("recommendation");
            let review = document.getElementById("review");
            let responseValue = selectElement.value;
            let responseHash = await sha256(review.value);
            console.log("specialty", c[0]);
            console.log("index", index);
            console.log("responseValue", responseValue);
            console.log("hash", "0x" + responseHash);

            submitReview(
              contract,
              c,
              index,
              responseValue,
              responseHash,
              problem,
              review
            );
          }
        });
        // Add the new button to the parent element
        parentElement.appendChild(submitReviewButton);
      } else {
        document.getElementById("review-area").style.display = "none";
        document.getElementById("qualification").style.display = "block";
      }
    });

    document.getElementById("numHIPs").innerHTML = HIPcount;
  }
  console.log(specCount);
  for (i = 0; i < 23; i++) {
    document.getElementById("spec" + i).innerHTML = specCount[i];
  }
  document.getElementById("loading").style.display = "none";
} //End of refresh function declaration
refresh();
/**
async function refreshByProposer() {
  document.getElementById("loading").innerHTML = "Loading on-chain data...";
  let HIPcount = 0;
  /**
await axios.get('./db.json')
  .then((response) => {
    db = response.data

  });

  await axios.post("/getMyJSON").then((response) => {
    db = response.data;
  });

  //axios.get('/getMyJSON').then((response) => {
  //  console.log(response.data);
  //}).catch((error) => {
  //  console.error(error);
  //});

  //Getting data from the contract
  contract.methods.getNumProposers().call(async function (err, numProposers) {
    if (!err) {
      const currentBlock = await web3.eth.getBlock("latest");
      let board = document.getElementById("board");
      for (i = 0; i < numProposers; i++) {
        //loops through all proposers
        var proposer = await contract.methods.getProposer(i).call();
        let problemCount = await contract.methods.getHIPCount(proposer).call();
        for (var j = 0; j < problemCount; j++) {
          problem = await contract.methods.HIPs(proposer, j).call();
          HIPcount++;
          let div = document.createElement("div");
          div.className = "job-card";
          let header = document.createElement("div");
          header.className = "job-card-header";

          var tag;
          tag = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          tag.setAttributeNS(null, "viewBox", "0 0 512 512");
          tag.setAttributeNS(null, "fill", "#fff");
          tag.setAttributeNS(null, "style", "background-color:#55acee");
          header.appendChild(tag);
          let title = document.createElement("div");
          title.className = "job-card-title";
          title.innerHTML = problem[2];
          let subtitle = document.createElement("div");
          subtitle.className = "job-card-subtitle";
          subtitle.innerHTML = problem[1];
          let description = document.createElement("div");
          title.innerHTML = problem[4];
          let specialties = document.createElement("div");
          specialties.className = "job-detail-buttons";
          let s = problem[5];
          for (let k = 0; k < 23; k++) {
            if ((s & (1 << k)) != 0) {
              let spec = document.createElement("button");
              spec.className = "search-buttons detail-button";
              spec.innerHTML = k;
              specialties.appendChild(spec);
            }
          }
          let buttons = document.createElement("div");
          buttons.className = "job-card-buttons";
          let button1 = document.createElement("button");
          button1.className = "search-buttons card-buttons";
          button1.innerHTML = "Review";
          let button2 = document.createElement("button");
          button2.className = "search-buttons card-buttons-msg";
          button2.innerHTML = "Dowload PDF";
          buttons.appendChild(button1);
          buttons.appendChild(button2);
          div.appendChild(header);
          div.appendChild(title);
          div.appendChild(subtitle);
          div.appendChild(specialties);
          div.appendChild(buttons);
          board.insertBefore(div, board.children[0]);
          document.getElementById("numHIPs").innerHTML = HIPcount;
        }
      }
      document.getElementById("loading").style.display = "none";
    }
  });
}
*/

function filterCardsBySpecialties(specialtyArray) {
  // Get all job-card elements
  const cards = document.getElementsByClassName("job-card");

  // Iterate through all cards
  for (let card of cards) {
    // Get the specialties of the current card
    const cardSpecialties = card.querySelectorAll(".detail-button");
    const cardSpecialtyIds = Array.from(cardSpecialties).map((s) =>
      parseInt(s.id)
    );

    // Check if the card has at least one matching specialty
    const hasMatchingSpecialty = cardSpecialtyIds.some((s) =>
      specialtyArray.includes(s)
    );

    // Hide the card if it doesn't have any matching specialties
    if (!hasMatchingSpecialty) {
      card.style.display = "none";
    } else {
      card.style.display = "block";
    }
  }
}

document.getElementById("Filter").addEventListener("click", function () {
  // Get all the checkboxes
  const checkboxes = document.querySelectorAll(".job-style");

  // Filter out the checked checkboxes and extract their ids as numbers
  const checkedSpecialties = Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => parseInt(checkbox.id.replace("job", "")));

  // Call the filterCardsBySpecialties function with the array of checked specialties
  filterCardsBySpecialties(checkedSpecialties);
});

function sortCardsLatest() {
  // Get all job-card elements and convert it to an array
  const cards = Array.from(document.getElementsByClassName("job-card"));

  // Map the cards to an array of [id, card] pairs
  const cardsWithIds = cards.map((card) => {
    // Extract the id as a number
    const id = parseInt(card.id);

    return [id, card];
  });

  // Sort the array by the ids
  const sortedCardsWithIds = cardsWithIds.sort((a, b) => b[0] - a[0]);

  // Update the order of the cards
  sortedCardsWithIds.forEach(([, card], index) => {
    card.style.order = index;
  });
}
document.getElementById("byTop").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent the default action of the <a> element
  document.getElementById("choice").innerHTML =
    "Top Manuscripts <i class='fa fa-caret-down'></i>";
  sortCardsTop();
});

function sortCardsTop() {
  // Get all job-card elements and convert it to an array
  const cards = Array.from(document.getElementsByClassName("job-card"));

  // Map the cards to an array of [score, card] pairs
  const cardsWithScores = cards.map((card) => {
    // Find the scoreDisplay element and extract its numeric content
    const scoreDisplay = card.querySelector(".scoreDisplay");
    if (scoreDisplay) {
      score = parseInt(scoreDisplay.textContent);
    } else {
      console.log("scoreDisplay is null for card: ", card);
      score = 0; // or whatever default you want in case of no scoreDisplay element
    }
    return [score, card];
  });

  // Sort the array by the scores
  const sortedCardsWithScores = cardsWithScores.sort((a, b) => b[0] - a[0]);

  // Update the order of the cards
  sortedCardsWithScores.forEach(([, card], index) => {
    card.style.order = index;
  });
}

document.getElementById("byLatest").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent the default action of the <a> element
  document.getElementById("choice").innerHTML =
    "Latest Requests <i class='fa fa-caret-down'></i>";
  sortCardsLatest();
});

function sortCardsByBounty() {
  // Get all job-card elements and convert it to an array
  const cards = Array.from(document.getElementsByClassName("job-card"));

  // Map the cards to an array of [bountyValue, card] pairs
  const cardsWithBountyValues = cards.map((card) => {
    const bountyElement = card.querySelector(".icons-container .bountyValue");

    // Check if the bountyValue element exists before attempting to access its innerHTML
    if (bountyElement) {
      // Extract the number using a regular expression
      const numberMatch = bountyElement.innerHTML.match(/[\d.]+/);

      if (numberMatch) {
        const bountyValue = parseFloat(numberMatch[0]);
        return [bountyValue, card];
      }
    }

    // If no bountyValue element or number is found, use 0 as the default value
    return [0, card];
  });

  // Sort the array by the bounty values
  const sortedCardsWithBountyValues = cardsWithBountyValues.sort(
    (a, b) => b[0] - a[0]
  );

  // Update the order of the cards
  sortedCardsWithBountyValues.forEach(([, card], index) => {
    card.style.order = index;
  });
}

document.getElementById("byBounty").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent the default action of the <a> element
  document.getElementById("choice").innerHTML =
    "Highest Bounties <i class='fa fa-caret-down'></i>";
  sortCardsByBounty();
});

function sortCardsByReviews(option) {
  // Get all job-card elements and convert it to an array
  const cards = Array.from(document.getElementsByClassName("job-card"));

  // Map the cards to an array of [reviewCount, card] pairs
  const cardsWithReviewCounts = cards.map((card) => {
    const reviewElement = card.querySelector(".icons-container .numRev");

    // Check if the reviewElement exists before attempting to access its innerHTML
    if (reviewElement) {
      // Extract the number using a regular expression
      const numberMatch = reviewElement.innerHTML.match(/(\d+)\s*reviews/);

      if (numberMatch) {
        const reviewCount = parseInt(numberMatch[1]);
        return [reviewCount, card];
      }
    }

    // If no reviewElement or number is found, use 0 as the default value
    return [0, card];
  });
  let sortedCardsWithReviewCounts;
  if (option == "most") {
    // Sort the array by the review counts
    sortedCardsWithReviewCounts = cardsWithReviewCounts.sort(
      (a, b) => b[0] - a[0]
    );
  } else if (option == "least") {
    // Sort the array by the reverse review counts
    sortedCardsWithReviewCounts = cardsWithReviewCounts.sort(
      (a, b) => a[0] - b[0]
    );
  }
  // Update the order of the cards
  sortedCardsWithReviewCounts.forEach(([, card], index) => {
    card.style.order = index;
  });
}

document.getElementById("byReview").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent the default action of the <a> element
  document.getElementById("choice").innerHTML =
    "Most reviews <i class='fa fa-caret-down'></i>";
  sortCardsByReviews("most");
});

document
  .getElementById("byNoReview")
  .addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the default action of the <a> element
    document.getElementById("choice").innerHTML =
      "Least reviews <i class='fa fa-caret-down'></i>";
    sortCardsByReviews("least");
  });

function sortCardsByTimeLeft() {
  // Get all job-card elements and convert it to an array
  const cards = Array.from(document.getElementsByClassName("job-card"));

  // Map the cards to an array of [timeLeftInMinutes, card] pairs
  const cardsWithTimeLeft = cards.map((card) => {
    const timeLeftElement = card.querySelector(".icons-container .timeLeft");

    // Check if the timeLeftElement exists before attempting to access its innerHTML
    if (timeLeftElement) {
      // Extract the number and unit using a regular expression
      const timeMatch = timeLeftElement.innerHTML.match(/(\d+)\s*(\w+)/);

      if (timeMatch) {
        let timeLeftInMinutes;
        const timeValue = parseInt(timeMatch[1]);
        const timeUnit = timeMatch[2];

        // Convert all time values to minutes
        switch (timeUnit) {
          case "days":
            timeLeftInMinutes = timeValue * 24 * 60;
            break;
          case "hours":
            timeLeftInMinutes = timeValue * 60;
            break;
          case "minutes":
            timeLeftInMinutes = timeValue;
            break;
          default:
            console.error(`Unexpected time unit: ${timeUnit}`);
            timeLeftInMinutes = 0;
        }

        return [timeLeftInMinutes, card];
      }
    }

    // If no timeLeftElement or number is found, use Infinity as the default value
    // so these cards will be sorted to the end
    return [Infinity, card];
  });

  // Sort the array by the time left in minutes
  const sortedCardsWithTimeLeft = cardsWithTimeLeft.sort((a, b) => a[0] - b[0]);

  // Update the order of the cards
  sortedCardsWithTimeLeft.forEach(([, card], index) => {
    card.style.order = index;
  });
}

document
  .getElementById("byTimeLeft")
  .addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the default action of the <a> element
    document.getElementById("choice").innerHTML =
      "Closing soon <i class='fa fa-caret-down'></i>";
    sortCardsByTimeLeft();
  });
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function intToRGB(i) {
  const c = (i & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function toColor(string) {
  return intToRGB(hashCode(string));
}

function createShape(tag, type, attributes) {
  const shape = document.createElementNS("http://www.w3.org/2000/svg", type);
  for (const key in attributes) {
    shape.setAttributeNS(null, key, attributes[key]);
  }
  tag.appendChild(shape);
}

function generatePattern(tag, backgroundColor) {
  const invertedColor =
    "#" +
    (0xffffff ^ parseInt(backgroundColor.slice(1), 16))
      .toString(16)
      .padStart(6, "0");
  const hash = Math.abs(hashCode(backgroundColor));

  for (let i = 0; i < 5; i++) {
    const type = "circle";
    const size = i * 60;
    const attributes = {
      fill: invertedColor,
      opacity: 0.05 + (hash % 10) / 15,
    };

    attributes.cx = 256;
    attributes.cy = 256;
    attributes.r = size;

    createShape(tag, type, attributes);
  }
}
function createTagElement(color) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttributeNS(null, "viewBox", "0 0 1024 1024");

  // Set fill color
  svg.style.setProperty(color, color);

  // Set the background color tive color
  svg.style.setProperty("var(--active-light-color)", color);

  // Create random squares for pattern
  for (let i = 0; i < 100; i++) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttributeNS(null, "width", Math.random() * 200);
    rect.setAttributeNS(null, "height", Math.random() * 200);
    rect.setAttributeNS(null, "x", Math.random() * 1200);
    rect.setAttributeNS(null, "y", Math.random() * 1200);
    rect.setAttributeNS(null, "fill", color);
    svg.appendChild(rect);
  }

  svg.style.backgroundColor = "var(--active-light-color)";
  return svg;
}

// Function to lighten the color
function lightenColor(color, percent = 20) {
  var num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = ((num >> 8) & 0x00ff) + amt,
    G = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
const specs = [
  "Machine Learning",
  "Data Analysis",
  "Deep Learning",
  "Probability Theory",
  "Artificial Intelligence",
  "Healthcare",
  "Data Engineering",
  "Business Analytics",
  "Software Engineering",
  "Business Intelligence",
  "Data Mining",
  "Mathematics",
  "Natural Language Processing",
  "Algorithms",
  "Big Data",
  "Cybersecurity",
  "Finance",
  "Marketing",
  "Blockchain",
  "Data Warehousing",
  "Architecture",
  "Data collection",
  "Data Visualization",
];

function reco(number) {
  if (number == 0) {
    return "Minor revision";
  } else if (number == 1) {
    return "Major revision";
  } else if (number == 2) {
    return "Accept";
  } else if (number == 3) {
    return "Reject";
  } else {
    return "N/A";
  }
}
async function displayReviews(index) {
  index = parseInt(index);
  try {
    const response = await fetch(`/reviews/${index}`);
    const reviews = await response.json();
    console.log("Received reviews:", reviews);
    if (reviews && reviews.length > 0) {
      const reviewsList = document.createElement("ul");
      reviewsList.className = "space-y-4";

      reviews.forEach((review) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
          <div class="overview-text-subheader bg-[var(--theme-bg-color)] relative top-0 mx-auto p-5 border max-w-2xl shadow-lg rounded-md">
            <h2 class="font-bold mb-2">Review #${
              parseInt(review.responseNum) + 1
            }</h2>
            <p class="font-bold"> Recommendation: <span class="font-normal">${reco(
              review.recommendation
            )}</span> </p> 
            <p class="font-bold"> Review:  <span class="font-normal">${
              review.review
            }</span></p>
          </div>`;
        reviewsList.appendChild(listItem);
      });

      const existingReviewsDiv = document.querySelector(".existing-reviews");

      existingReviewsDiv.innerHTML = ""; // Clear the existing content
      const reviewHeader = document.createElement("div");
      reviewHeader.classList.add("overview-text-header");
      reviewHeader.innerHTML = "Reviews";
      existingReviewsDiv.appendChild(reviewHeader);
      existingReviewsDiv.appendChild(reviewsList);
    }
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

async function incrementNumReviews(id) {
  const data = { id: id };
  try {
    const res = await axios.put("/HIP/incrementNumReviews", data);
    console.log(res.data);
  } catch (error) {
    console.error("Error incrementing number of reviews:", error);
  }
}

async function incrementReviewerCount(address) {
  const data = { address: address };
  try {
    const res = await axios.put("/HIP/incrementReviewerCount", data);
    console.log(res.data);
  } catch (error) {
    console.error("Error incrementing number of reviews:", error);
  }
}

async function fetchReviewerCount(address) {
  try {
    const response = await fetch(`/HIP/getReviewerCount/${address}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Reviewer count for address ${address}:`, data.reviewCount);
      return data.reviewCount;
    } else {
      console.error(
        "Error fetching reviewer count:",
        response.status,
        response.statusText
      );
      return null;
    }
  } catch (error) {
    console.error("Error fetching reviewer count:", error);
    return null;
  }
}

async function displayReviewedPapers(userAddress) {
  const responseRefsCount = await fetchReviewerCount(accounts[0]);
  const table = document.getElementById("responseRefsTable");
  table.classList.add("custom-table");
  table.innerHTML = "";
  // Clear previous table data, if any
  if (responseRefsCount > 0) {
    document.getElementById("noReview").innerHTML = "";
  } else {
    document.getElementById("noReview").innerHTML =
      "You have not submitted any review yet. Once you do, your reviews will appear here and you will be able to request payment once the corresponding requests close.";
  }

  // Add table headers
  const header = table.createTHead();
  const headerRow = header.insertRow(0);

  const headerCell1 = document.createElement("th");
  headerCell1.innerHTML = "Author";
  headerRow.appendChild(headerCell1);

  const headerCell2 = document.createElement("th");
  headerCell2.innerHTML = "Request Index";
  headerRow.appendChild(headerCell2);

  const headerCell5 = document.createElement("th");
  headerCell5.innerHTML = "Closed";
  headerRow.appendChild(headerCell5);

  const headerCell3 = document.createElement("th");
  headerCell3.innerHTML = "Paid";
  headerRow.appendChild(headerCell3);

  const headerCell4 = document.createElement("th");
  headerCell4.innerHTML = "Action";
  headerRow.appendChild(headerCell4);

  // Populate table with ResponseRef data
  for (let i = 0; i < responseRefsCount; i++) {
    const responseRef = await contract.methods
      .responseRefs(userAddress, i)
      .call();
    const row = table.insertRow(-1);
    row.insertCell(0).innerHTML =
      responseRef.proposer.substring(0, 5) +
      "..." +
      responseRef.proposer.substr(responseRef.proposer.length - 4, 4);

    row.insertCell(1).innerHTML = responseRef.index;
    const HIP = await contract.methods
      .HIPs(responseRef.proposer, responseRef.index)
      .call();
    let currentBlock = await web3.eth.getBlock("latest");
    currentBlock = currentBlock.timestamp;
    row.insertCell(2).innerHTML =
      currentBlock > parseInt(HIP[0]) + parseInt(HIP[1]) ? "Yes" : "No";

    row.insertCell(3).innerHTML = responseRef.paid ? "Yes" : "No";

    if (!responseRef.paid) {
      const cell = row.insertCell(4);
      const button = document.createElement("button");
      button.classList.add("search-buttons card-buttons");
      button.innerHTML = "Request Payment";
      button.onclick = () => requestPayment(userAddress, i);
      cell.appendChild(button);
    } else {
      row.insertCell(4).innerHTML = "-";
    }
  }
}

async function requestPayment(userAddress, index) {
  // Here you should call your smart contract function to request payment
  try {
    const receipt = await contract.methods
      .withdrawPayment(index)
      .send({ from: userAddress });
    console.log("Payment requested successfully:", receipt);
    //Empty the table
    document.getElementById("responseRefsTable").innerHTML = "";
    await displayReviewedPapers(); // Refresh the table after the payment request
  } catch (error) {
    console.error("Error requesting payment:", error);
  }
}

// Setup the event listener for the NFT Mint
document.getElementById("mintNFT").addEventListener("click", async () => {
  // Check if Web3 has been injected by the browser
  if (
    typeof window.ethereum !== "undefined" ||
    typeof window.web3 !== "undefined"
  ) {
    // Web3 browser user detected. You can now use the provider.
    const provider = window["ethereum"] || window.web3.currentProvider;
    const web3 = new Web3(provider);

    // Request account access if needed
    await ethereum.enable();

    // Get the connected accounts
    const accounts = await web3.eth.getAccounts();

    // Check if there are any accounts connected
    if (accounts.length > 0) {
      // Create the contract instance
      const tokenContract = new web3.eth.Contract(NFTABI, NFTAddress);
      // Show the animation
      showAnimation();
      // Call the mint method
      tokenContract.methods
        .mint()
        .send({ from: accounts[0] })
        .then((result) => {
          console.log(result);
          alert("Minting successful");
          // Hide the animation
          hideAnimation();
        })
        .catch((error) => {
          // Hide the animation
          hideAnimation();
          console.error(error);
          alert("Minting failed");
        });
    } else {
      // Hide the animation
      hideAnimation();
      alert("Please connect your wallet");
    }
  } else {
    // Hide the animation
    hideAnimation();
    // No Web3 browser user detected. Show an alert.
    alert(
      "No Ethereum wallet was found. Please install one (e.g., MetaMask) to interact with this application."
    );
  }
});
