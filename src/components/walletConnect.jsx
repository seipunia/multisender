/* eslint-disable react/prop-types */
import React, { useEffect, useContext } from "react";
import { Transition } from 'react-transition-group';
import { connect } from '@sei-js/core'
import leap from "../assets/leap.png";
import fin from "../assets/fin.png";
import compass from "../assets/compass.png";
import falcon from "../assets/falcon.png";


const WalletConnectContext = React.createContext({
    isModalOpen: false,
    openWalletConnect: () => { },
    closeWalletConnect: () => { },
    wallet: null,
    disconnectWallet: () => { }
})

const wallets = [
    ["leap", leap], 
    ["fin", fin],
    ["compass", compass], 
    ["falcon", falcon],
];


const WalletConnectProvider = ({ children }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [wallet, setWallet] = React.useState(null)

    const openWalletConnect = () => setIsModalOpen(true)
    const closeWalletConnect = () => setIsModalOpen(false)

    const connectWallet = (name) => {
        connect(name, "pacific-1").then((wallet) => {
            setWallet(wallet)
            closeWalletConnect()
        }).catch((err) => {
            console.log(err)
        })
    }

    // useEffect(() => {
    //     // Check if user is previously connected
    //     const storedWallet = localStorage.getItem("wallet");
    //     if (storedWallet) {
    //         const parsedWallet = JSON.parse(storedWallet);
    //         setWallet(parsedWallet);
    //     }
    // // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);
    
    useEffect(() => {
        // // Save wallet to localStorage on connection
        // if (wallet) {
        //     localStorage.setItem("wallet", JSON.stringify(wallet));
        // } else {
        //     localStorage.removeItem("wallet");
        // }
    }, [wallet]);

    const disconnectWallet = () => {
        setWallet(null)
    }


    return (
        <WalletConnectContext.Provider value={{ isModalOpen, openWalletConnect, closeWalletConnect, wallet, disconnectWallet }}>
            {children}
            <WalletConnectModal connectWallet={connectWallet} />
        </WalletConnectContext.Provider>
    );
}

const WalletConnectModal = ({ connectWallet }) => {
    const { isModalOpen, closeWalletConnect } = useContext(WalletConnectContext);
    const duration = 100;

    return (
        <Transition in={isModalOpen} timeout={duration} unmountOnExit>
            {state => (
                <Modal state={state} duration={duration}>
                    <Overlay onClick={closeWalletConnect} />
                    <Dialog>
                        <DialogHeader closeWalletConnect={closeWalletConnect} />
                        <DialogBody connectWallet={connectWallet} />
                    </Dialog>
                </Modal>
            )}
        </Transition>
    );
}

const Modal = ({ state, children, duration }) => (
    <div className={`fixed top-0 left-0 w-full h-full min-h-screen bg-black bg-opacity-75 z-20 flex transition-opacity duration-${duration} ${state === 'entering' || state === 'entered' ? 'opacity-100' : 'opacity-0'}`}>
        {children}
    </div>
);

const Overlay = ({ onClick }) => (
    <div onClick={onClick} className="absolute w-full h-full z-10"></div>
);

const Dialog = ({ children }) => (
    <div className="relative w-[350px] max-w-full max-h-full z-20 text-white pt-0 rounded-lg backdrop-blur-[20px] bg-[rgba(0,0,0,0.8)] overflow-y-auto flex flex-col m-auto shadow-lg">
        {children}
    </div>
);

const DialogHeader = ({ closeWalletConnect }) => (
    <div className="flex items-center justify-between p-6">
        <div className="text-lg font-medium">Connect SEI Wallet</div>
        <button onClick={closeWalletConnect} className="text-2xl">&#215;</button>
    </div>
);

const DialogBody = ({ connectWallet }) => (
    <div>
        {wallets.map(([name, icon]) => (
            <div key={name} onClick={() => connectWallet(name)} className="flex p-4 items-center hover:bg-white hover:bg-opacity-5 cursor-pointer">
                <img src={icon} alt={`${name} icon`} className="w-8 h-8" />
                <div className="ml-4">{name.charAt(0).toUpperCase() + name.slice(1)}</div>
            </div>
        ))}
    </div>
);


export { WalletConnectProvider, WalletConnectContext };