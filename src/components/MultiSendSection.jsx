/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  Card,
  Button,
  Label,
  FileInput,
  Timeline,
  Modal,
} from "flowbite-react";
import { useState } from "react";
import useWalletConnect from "../hooks/useWalletConnect";
import CodeMirror from "@uiw/react-codemirror";
import csvFileImage from "../assets/imageCsv.png";
import completedImage from "../assets/Completed-pana.svg";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import BigNumber from "bignumber.js";
import config from "../config";
import { useEffect } from "react";
import {
  processCsvData,
  isAddressValid,
  formatAmountsToSmallestUnits,
} from "../helpers";
import { toast } from "react-hot-toast";
import { getSigningCosmWasmClient } from "@sei-js/core";
import { GasPrice } from "@cosmjs/stargate";
import { splitIntoChunks } from "../helpers";

const MultiSendSection = () => {
  const [csvFile, setCsvFile] = useState();
  const [csvList, setCsvList] = useState();
  const [currentStep, setCurrentStep] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [tokenAddr, setTokenAddr] = useState("");
  const [seiBal, setSeiBal] = useState("0.00");
  const [usersTokenBal, setUsersTokenBal] = useState("0.00");
  const [sentTxHash, setSentTxHash] = useState("");
  const [totalSendAmount, setTotalSendAmount] = useState();
  const [totalSendAmountFormated, setTotalSendAmountFormated] = useState();
  const [tokenDetails, setTokenDetails] = useState({
    name: "",
    symbol: "",
    decimals: 6
  })
  const [recipients, setRecipients] = useState()
  const { openWalletConnect, wallet } = useWalletConnect()
  const [sendLoading, setSendLoading] = useState(false)

  const handleCodeMirror = (e) => {
    console.log(e);
    let text = e;
    setCsvList(text);
    const data = processCsvData(text);

    const multiple = Math.pow(10, tokenDetails.decimals);
    const formattedAmount = new BigNumber(parseFloat(data.totalAmount))
      .multipliedBy(multiple)
      .toString();
    setTotalSendAmountFormated(formattedAmount);
    setTotalSendAmount(data.totalAmount);
    setRecipients(data.recipients);
  };

  async function queryCw20Details() {
    const client = await SigningCosmWasmClient.connect(config.rpc);

    try {
      const tokenInfo = await client.queryContractSmart(tokenAddr, {
        token_info: {},
      });

      setTokenDetails({
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
      });
    } catch (error) {
      console.error("Error querying CW20 details:", error);
      throw error;
    }
  }

  async function queryUserTokenBal() {
    const client = await SigningCosmWasmClient.connect(config.rpc);

    try {
      const balance = await client.queryContractSmart(tokenAddr, {
        balance: { address: wallet?.accounts[0].address },
      });

      let seiBalance = await client.getBalance(
        wallet?.accounts[0].address,
        "usei"
      );
      setSeiBal(
        new BigNumber(seiBalance.amount).div(1e6).toFixed(2).toString()
      );

      const divisor = Math.pow(10, tokenDetails.decimals);
      const formattedBalance = new BigNumber(balance.balance)
        .div(divisor)
        .toFixed(2)
        .toString();
      setUsersTokenBal(formattedBalance);
    } catch (error) {
      console.error("Error querying CW20 details:", error);
      throw error;
    }
  }

  useEffect(() => {
    if (tokenAddr) queryCw20Details();
    if (wallet && tokenAddr) queryUserTokenBal();
  }, [wallet, tokenAddr]);

  const nextStep = () => {
    if (!isAddressValid(tokenAddr))
      return toast.error("Input Error: Please provide a valid token address");
    if (
      !recipients ||
      typeof recipients !== "object" ||
      Object.keys(recipients).length < 1
    ) {
      return toast.error(
        "Input Error: Please provide a valid input or csv file"
      );
    }
    setCurrentStep(2);
  };

  const previousStep = () => {
    setCurrentStep(1);
  };

  const handleCsvFile = async (e) => {
    if (e.target.files) {
      try {
        const file = e.target.files[0];
        const fileUrl = URL.createObjectURL(file);
        console.log("file url", fileUrl);
        const response = await fetch(fileUrl);
        console.log("response", response);
        const text = await response.text();
        console.log("Text", text);
        setCsvList(text.trim());
        const data = processCsvData(text);
        console.log("DATA", data);

        const multiple = Math.pow(10, tokenDetails.decimals);
        const formattedAmount = new BigNumber(parseFloat(data.totalAmount))
          .multipliedBy(multiple)
          .toString();
        setTotalSendAmountFormated(formattedAmount);
        setTotalSendAmount(data.totalAmount);
        setRecipients(data.recipients);
      } catch (error) {
        console.error(error);
        toast.error("Error Processing CSV : " + error.message);
      }
    }
  };

  async function ApproveAndSend() {
    if (wallet === null) return openWalletConnect();
    if (parseFloat(totalSendAmount) > parseFloat(usersTokenBal)) {
      return toast.error(`Error: Insufficient ${tokenDetails.name} balance. Requires ${totalSendAmount}, available ${usersTokenBal}.`);
    }

    const finalData = formatAmountsToSmallestUnits(recipients, tokenDetails.decimals); //
    const client = await getSigningCosmWasmClient(config.rpc, wallet.offlineSigner, { gasPrice: GasPrice.fromString("0.01usei") });

    console.log("finalData", finalData);
    console.log("totalSendAmountFormated", totalSendAmountFormated);

    let msgs = [{
      contractAddress: tokenAddr,
      msg: {
        increase_allowance: {
          spender: config.contractAddress,
          amount: totalSendAmountFormated,
        },
      },
    }];

    const chunks = finalData.length > 80 ? splitIntoChunks(finalData, 80) : [finalData];
    msgs = msgs.concat(chunks.map(chunk => ({
      contractAddress: config.contractAddress,
      msg: {
        send: {
          recipients: chunk,
          token_addr: tokenAddr
        }
      }
    })));

    let loading = toast.loading("Sending...");
    setSendLoading(true);

    try {
      console.log("msgs ", msgs)
      for (let i = 1; i < msgs.length; i++) {
        if (i > 1) {
          let contractAddress= msgs[i].contractAddress
          let msg = msgs[i].msg
          await client.execute(wallet?.accounts[0].address, contractAddress, msg, {
            amount: [{ denom: "usei", amount: "0.1" }],
            gas: "10000000"
          });
        } else {
          await client.executeMultiple(wallet?.accounts[0].address, [msgs[0], msgs[i]], {
            amount: [{ denom: "usei", amount: "0.1" }],
            gas: "10000000"
          });
        }
      }
      toast.dismiss(loading);
      toast.success(<p>
        Tokens Sent successfully
        <a href={`https://www.seiscan.app/pacific-1/accounts/${wallet?.accounts[0].address}/txs`}
          target="_blank" rel="noreferrer">view</a>
      </p>
      );
      setSendLoading(false);
      const hash = `https://www.seiscan.app/pacific-1/accounts/${wallet?.accounts[0].address}/txs`;
      setSentTxHash(hash);
      setCurrentStep(3);
    } catch (e) {
      console.error(e);
      toast.dismiss(loading);
      toast.error("Sending Error: " + e.message);
      setSendLoading(false);
    }
  }

  return (
    <section>
      <div className="mx-auto max-w-screen-xl px-4 py-8 lg:py-16">
        <div className="mb-0 grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="col-span-6 text-center sm:mb-6 lg:mb-0 lg:text-left">
            <h1 className="mb-4 text-2xl sm:text-3xl md:text-5xl lg:text-5xl xl:text-6xl leading-none tracking-tight text-white font-extralight">
              Send tokens to multiple addresses with Sei MultiSender
            </h1>
            <div className="flex justify-center sm:justify-center md:justify-start lg:justify-start xl:justify-start">
              <Button
                color="light"
                className="mr-4"
                onClick={() => setOpenModal(true)}
              >
                How it works
              </Button>
              <Button
                color="dark"
                href="https://docs.google.com/forms/d/e/1FAIpQLSdVux0QUXIzsVbSuxDRY0NQBWr6BvwxRCLkhxlZCjURJmvWmQ/viewform"
                target="_blank"
              >
                Feedback Form
              </Button>
            </div>
            <div>
              <Modal show={openModal} onClose={() => setOpenModal(false)}>
                <Modal.Header>How it Works</Modal.Header>
                <Modal.Body>
                  <div>
                    <Timeline>
                      <Timeline.Item className="mb-2">
                        <Timeline.Point />
                        <Timeline.Content>
                          <Timeline.Body className="bg-white text-rose-500 mb-0">
                            <ul>
                              <li className="mb-2">
                                1. Click on the connect wallet button and
                                connect to your compass wallet.
                              </li>
                              <li className="mb-2">
                                2. Input and confirm the token address to send.
                              </li>
                              <li className="mb-2">
                                3. Either paste the recipient addresses & amount
                                in the text area provided or upload a csv with
                                all the list of addresses & amount.
                              </li>
                              <li className="text-black mb-2">
                                4.
                                <span className="font-semibold mr-1">
                                  Note: Ensure the addresses & amount follow
                                  this pattern;
                                </span>
                                <span className="text-black mb-2">
                                  <br />
                                  sei1ljz0qseh583lahgerss78v8xakwg09lec2grh7,150000
                                  <br />
                                  sei1v77grtgprxq84pvzec92f57kj8r3tpsf2v908g,20000000
                                </span>
                              </li>
                              <li className="mb-2">
                                5. Click on proceed to move onto the next step.
                              </li>
                              <li className="mb-2">
                                6. Verify the list of addresses, token amount to
                                send, token balance & your SEI balance.
                              </li>
                              <li className="mb-2">
                                7. Click on confirm to send the tokens and check
                                the tx on your favorite block explorer.
                              </li>
                              <li className="mb-2">
                                8. Ensure your spreadsheet follows the pattern
                                below when entering the data in the csv file.
                              </li>
                            </ul>
                            <div>
                              <img src={csvFileImage} alt="Sei Punia Logo" />
                            </div>
                          </Timeline.Body>
                        </Timeline.Content>
                      </Timeline.Item>
                    </Timeline>
                  </div>
                </Modal.Body>
              </Modal>
            </div>
          </div>

          <div className="col-span-6">
            <Card className="w-full bg-gray-800 border-rose-500">
              <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
                <li className="flex md:w-full items-center text-rose-500  sm:after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700">
                  <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500">
                    <span
                      className={`me-2 w-6 h-6 rounded-full text-white ${
                        currentStep === 1 ? "bg-rose-500" : "bg-gray-500"
                      }`}
                    >
                      1
                    </span>
                    <span
                      className={`${
                        currentStep === 1 ? "text-white" : "text-gray-500"
                      }`}
                    >
                      Prepare
                    </span>
                  </span>
                </li>
                <li className="flex md:w-full items-center after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700">
                  <span className="flex items-center after:content-['/'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500">
                    <span
                      className={`me-2 w-6 h-6 rounded-full text-white ${
                        currentStep === 2 ? "bg-rose-500" : "bg-gray-500"
                      }`}
                    >
                      2
                    </span>
                    <span
                      className={`${
                        currentStep === 2 ? "text-white" : "text-gray-500"
                      }`}
                    >
                      Send
                    </span>
                  </span>
                </li>
                <li className="flex items-center">
                  <span
                    className={`me-2 w-6 h-6 rounded-full text-white ${
                      currentStep === 3 ? "bg-rose-500" : "bg-gray-500"
                    }`}
                  >
                    3
                  </span>
                  <span
                    className={`${
                      currentStep === 3 ? "text-white" : "text-gray-500"
                    }`}
                  >
                    Complete
                  </span>
                </li>
              </ol>
              {currentStep === 1 && (
                <div style={{ height: "500px" }}>
                  <form className="mt-4">
                    <div>
                      <div className="mb-6">
                        <label
                          htmlFor="token-address"
                          className="mb-2 text-sm font-medium  text-white flex justify-between"
                        >
                          <p>Token Address</p>{" "}
                          <p>{tokenDetails.name !== "" && tokenDetails.name}</p>
                        </label>
                        <input
                          type="text"
                          id="token-address"
                          value={tokenAddr}
                          onChange={(e) => setTokenAddr(e.target.value)}
                          placeholder="eg. sei2f...scd24"
                          className="bg-gray-800 border border-rose-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        />
                      </div>
                      <div className="mb-4">
                        <label
                          htmlFor="token-csv"
                          className="mb-2 text-sm font-medium text-white flex justify-between"
                        >
                          <span>List of Addresses in CSV</span>
                          <span className="text-gray-500">Example of CSV</span>
                        </label>
                        <div className="w-80 sm:w-80 md:w-full">
                          <CodeMirror
                            value={csvList}
                            placeholder="wallet address,token amount"
                            className="flex justify-start"
                            height="200px"
                            width="100%"
                            onChange={handleCodeMirror}
                          />
                        </div>
                      </div>
                      <div id="fileUpload" className="max-w-xs">
                        <div className="mb-2 flex">
                          <Label
                            htmlFor="file"
                            className="text-white"
                            value="Select CSV file"
                          />
                        </div>
                        <FileInput
                          sizing="sm"
                          id="file"
                          accept=".csv"
                          color="warning"
                          value={csvFile}
                          onChange={handleCsvFile}
                        />
                      </div>
                      <div className="flex mt-8">
                        <Button
                          size={"md"}
                          className="w-full bg-rose-500"
                          onClick={nextStep}
                        >
                          Proceed
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
              {currentStep === 2 && (
                <div style={{ height: "500px" }}>
                  <div className="grid grid-cols-2 gap-8 my-4">
                    <Card className="w-full h-24 bg-gray-800 border-rose-500">
                      <h2 className="font-semibold text-white text-xl">
                        {totalSendAmount} {tokenDetails?.symbol}
                      </h2>
                      <span className="text-gray-300 text-sm">
                        Total number of tokens to send
                      </span>
                    </Card>
                    <Card className="w-full h-24 bg-gray-800 border-rose-500">
                      <h2 className="font-semibold text-white text-xl">
                        {usersTokenBal} {tokenDetails?.symbol}
                      </h2>
                      <span className="text-gray-300 text-sm">
                        Your token balance
                      </span>
                    </Card>
                    <Card className="w-full h-24 bg-gray-800 border-rose-500">
                      <h2 className="font-semibold text-white text-xl">
                        {seiBal} SEI
                      </h2>
                      <span className="text-gray-300 text-sm">
                        Your SEI balance
                      </span>
                    </Card>
                  </div>
                  <div>
                    <div className="text-white flex justify-between mb-1">
                      <span> List of addresses (First 1-5 addresses)</span>
                      <span>Amount</span>
                    </div>
                    {recipients.length &&
                      recipients.slice(0, 5).map((el, index) => (
                        <div
                          className="border-2 border-gray-400 mb-2 px-2 flex justify-between"
                          key={index.toString()}
                        >
                          <div className="text-gray-400">{el.recipient}</div>
                          <div className="text-gray-400">{el.amount}</div>
                        </div>
                      ))}
                    <div className="flex mt-4">
                      <Button
                        onClick={previousStep}
                        size={"md"}
                        className="w-full bg-amber-400 mr-2"
                      >
                        Back
                      </Button>
                      <Button disabled={sendLoading} onClick={ApproveAndSend} size={"md"} className="w-full bg-rose-500 ml-2">
                        {wallet == null ? "Connect Wallet" : "Confirm"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div style={{ height: "500px" }}>
                  <div className="grid grid-cols-1 gap-8 my-4">
                    <Card className="w-full h-96 bg-gray-800 border-rose-500">
                      <img
                        src={completedImage}
                        className="h-72"
                        alt="Completed Image"
                      />
                      <p className="text-white">Tokens Sent successfully!</p>
                      <p className="text-center mt-2 mb-8">
                        <a
                          href={sentTxHash}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-rose-500 px-2 py-1 text-white border-2"
                        >
                          View Transaction
                        </a>
                      </p>
                    </Card>
                  </div>
                  <div>
                    <div className="flex mt-4">
                      <Button
                        onClick={previousStep}
                        size={"md"}
                        className="w-full bg-rose-500 mr-2"
                      >
                        Home
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MultiSendSection;
