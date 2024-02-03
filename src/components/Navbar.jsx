"use client";
import { useEffect, useState } from "react";
import { Button, Navbar } from "flowbite-react";
import { BsWallet, BsCopy } from "react-icons/bs";
import puniaLogo from "../assets/punia.png";
import useWalletConnect from "../hooks/useWalletConnect";
import Wallet, { DropdownItem } from "./wallet";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate"
import BigNumber from "bignumber.js"
import config from "../config";
import { IoIosLogOut } from "react-icons/io";

const NavbarComponent = () => {
  const [balance, setBalance] = useState('0.00')

  const { openWalletConnect, wallet, disconnectWallet } = useWalletConnect()

  useEffect(() => {
    async function update() {
      const client = await SigningCosmWasmClient.connect(config.rpc)

      let balance = await client.getBalance(wallet?.accounts[0].address, "usei")
      setBalance((new BigNumber(balance.amount).div(1e6)).toFixed(2).toString())
    }
    if(wallet !== null)update()
  }, [wallet])

  return (
    <Navbar fluid rounded className="bg-transparent">
      <Navbar.Brand href="https://seipunia.com">
        <img src={puniaLogo} className="mr-3 h-6 sm:h-9" alt="Sei Punia Logo" />
        <span className="self-center whitespace-nowrap text-xl font-semibold text-white">
          Sei MultiSender
        </span>
      </Navbar.Brand>
      <div className="flex md:order-2">
        {wallet == null && <Button onClick={openWalletConnect} gradientDuoTone="pinkToOrange" size={"sm"}>
          Connect Wallet
          <BsWallet className="ml-2 h-4 w-4" />
        </Button>}
        {wallet !== null && (
          <Wallet
            balance={balance + " SEI"}
            address={wallet?.accounts[0].address}
          >
            <DropdownItem onClick={() => navigator.clipboard.writeText(wallet?.accounts[0].address)}><BsCopy className="mr-2 h-4 w-4" /> Copy Address</DropdownItem>
            <DropdownItem onClick={() => { disconnectWallet(); openWalletConnect() }}><BsWallet className="mr-2 h-4 w-4" /> Change Wallet</DropdownItem>
            <DropdownItem onClick={disconnectWallet}><IoIosLogOut className="mr-2 h-4 w-4" /> Disconnect</DropdownItem>
          </Wallet>
        )}
      </div>
    </Navbar>
  );
};

export default NavbarComponent;
