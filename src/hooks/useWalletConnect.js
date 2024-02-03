
import { useContext } from "react";
import { WalletConnectContext } from "../components/walletConnect";

export default function useWalletConnect() {
    const { isModalOpen, openWalletConnect, closeWalletConnect, wallet, disconnectWallet } = useContext(WalletConnectContext)
    return { isModalOpen, openWalletConnect, closeWalletConnect, wallet, disconnectWallet }
}
