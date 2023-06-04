# SciDex: Full Stack On-Chain Peer Review System
1. [Overview](#overview)
2. [Example Implementations](#example-implementations)
3. [Why Decentralize Scientific Peer Review?](#why-decentralize-scientific-peer-review)
4. [Repository Structure](#structure)
5. [Running the Repository](#running-the-repository)
6. [Customizing SciDex](#customizing-scidex)
7. [Contract Documentation](#contract-documentation)
8. [License](#license)
9. [Acknowledgements](#acknowledgements)


## 1. Overview {#overview}
### Video Walkthrough: https://www.youtube.com/watch?v=OdQnCx3MnIM

SciDex empowers Decentralized Science (DeSci) and domain-expert DAOs to effortlessly launch their own peer-reviewed academic journals.

With SciDex, authors can confidently submit manuscripts for peer review, ensuring qualified reviewers while maintaining their anonymity. Smart contracts handle decentralized payments and bounties, guaranteeing fair compensation for reviewers.

This repository provides a full stack solution, including the backend, frontend, and smart contracts required for SciDex. The user interface is built using Vanilla JavaScript, making it framework agnostic and adaptable to various development environments. 


## 2. Example Implementations {#example-implementations}
- [Data Science Journal](https://q4xjfj-3000.csb.app/) *(Note: This work benefited from a Shipyard Yard from Ocean Protocol, but is not otherwise affiliated or endorsed by Ocean Protocol. The Ocean bubble logo is used for illustration and is a registered trademark of its owner.)*

- [Medical Peer Review](https://u6iyjz-3000.csb.app/) *(Note: This work was done in partnership with MedDAO, but is not otherwise affiliated or endorsed by MedDAO. The MedDAO logo is used for illustration and is a registered trademark of its owner.)*

## 3. Why Decentralize Scientific Peer Review? {#why-decentralize-scientific-peer-review}
Traditional academic publishing is dyingfacing a significant decline. The industry's profitability is concentrated in the hands of a few dominant publishers, leading to predatory costs for authors and unfair compensation for reviewers (that is none whatsoever). The peer review process, plagued by biases and prolonged timelines, hinders the timely dissemination of research. Additionally, creators in academia are often inadequately compensated for their valuable contributions. However, decentralization emerges as a promising solution to revive this dying system. By embracing decentralized technologies like blockchain, we can introduce transparency, efficiency, and inclusivity, breathing new life into academic publishing and ensuring a vibrant and sustainable future.


## File Structure {#structure}

The repository is structured into the following components:
### Stack
- Smart Contracts: Solidity
- Web3: Web3.js, Wallet Connect
- Backend: Node.js
- Middleware: KOA
- Front-end: JavaScript, HTML, CSS (Tailwind, Font Awesome)
- Database: MongoDB

### Main Files

- `/contracts/SciDex.sol`: The Peer Review management smart contract.
- `/contracts/ERC1155.sol`: The NFT contract to qualify reviewers according to their specific specialties.
- `/app/server.js`: The backend server implementation.
- `/app/client.js`: Manages web3 and backend interactions.
- `/app/contracts.js`: Contains the address and ABI of the Peer Review and token contracts.
- `/app/script.js`: Implements various UI utilities.


## 5. Running the Repository {#running-the-repository}
1. Clone the repository to your local machine.
   ```
   git clone https://github.com/haailabs/SciDex
   ```

2. Navigate to the app directory.
   ```
   cd SciDex/app
   ```

3. Install required dependencies.
   ```
   npm install
   ```

4. Start the backend server.
   ```
   node server.js
   ```

5. The application should now be accessible on port 3000. Open your web browser and visit `http://localhost:3000` to access it.


## 6. Customizing SciDex {#customizing-scidex}

### Specialties

1. Replace the constants in `ERC1155.sol` with the relevant specialties for your application. 
2. Update the `const specs` in line 1675 of `client.js` to reflect the specialties you defined in `ERC1155.sol`. 
3. In `index.html`, update the options within the `<select>` element with the id "select-role" (line 168), and the menu element with the id "specs" in `index.html (line 252).

### Contracts

1. Deploy the `ERC1155.sol` and `SciDex.sol` smart contracts to your desired blockchain.

2. Initialize the `SciDex.sol` contract with the address of the deployed `ERC1155.sol` contract. 
3. Replace the addresses and ABIs of these two contracts in the `app/contracts.js` file.

### Database
1. Create a MongoDB database named "SciDex".
2. Replace the MongoDB connection URI in the `const uri` variable on line 10 of the `server.js` file, including the host, port, username, password, and database name.


### Layout, Style, and Branding

1. Have fun with `style.css` and `index.html`.

## Contract Documentation {#technical-details}

**Constructor**
- `constructor()`: Initializes the contract and sets the owner address to the `msg.sender`.

**Initialization**
- `initialize(address _tokenContract)`: Initializes the contract by setting the address of the ERC-1155 contract used to qualify reviewers.

**HIP Submission and Response**
- `submitHIP(uint _duration, bytes32 _pdfHash, bytes32 _requestHash, uint32 _specialties, uint _fee, uint _index)`: Allows a user to submit a HIP (Human Intelligence Primitive), which represents a request for review.
- `submitResponse(uint8 _specialty, uint _id, uint _responseValue, bytes32 _responseHash)`: Allows a user to submit a response to a HIP.

**Withdrawal and Payment**
- `withdrawFee(uint _id)`: Allows the creator of a HIP to withdraw their fee if the HIP is closed and has no responses.
- `withdrawPayment(uint _responseIndex)`: Allows a respondent to withdraw payment for a particular response if the HIP is closed.

**Getters**
- `getNumProposers()`: Returns the total number of proposers.
- `getNumHIPs()`: Returns the total number of HIPs.
- `getProposer(uint i)`: Returns the address of the i-th proposer.
- `getHIPCount(address _proposer)`: Returns the total number of HIPs submitted by a proposer.
- `getResponse(uint _indexHIP, uint _indexResponse)`: Returns a particular response to a HIP.

**Helper Function**
- `getBit(uint32 n, uint8 i)`: This function is a helper function that returns the i-th bit of the binary representation of a given number `n`.
- Parameters:
  - `n`: The input number for which the i-th bit is to be extracted.
  - `i`: The index of the bit to be extracted (0 being the rightmost bit).
- Returns:
  - `bool`: The function returns a boolean value indicating the value of the i-th bit (true for 1 and false for 0).

This function is used in the contract to encode the specialties of a manuscript in a `uint32` variable. Each specialty is represented by a bit in the binary representation of the `uint32` value. By using bitwise operations, the function extracts the value of a specific bit (specialty) from the `uint32` value.

Additionally, there are various modifiers (`onlyIfPaidEnough`, `onlyIfHoldsNFT`, `onlyIfHasNotResponded`, `onlyIfStillOpen`, `onlyIfClosed`, `onlyIfNoResponses`) that check certain conditions before executing the respective functions.

## 8. License {#license}
All code, except the ERC-1155 contract is shared under a CC-BY-NC-SA-4.0 license. Logos are the property of their respective owners and are used for illustration.

## 9. Acknowledgements {#acknowledgements}
The authors gratefully acknowledge the support received from Ocean Protocol through a Shipyard Grant. 
