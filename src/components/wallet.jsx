/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { FaAngleDown } from "react-icons/fa";
import { Button } from "flowbite-react";
import { shortenPublicKey } from "../helpers";

const DropdownButton = ({ balance, address, children, side = "right", mobileSide = "right" }) => {
    const dropdownRef = useRef(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative text-white" ref={dropdownRef}>
            <Button onClick={() => setDropdownOpen(!dropdownOpen)}  gradientDuoTone="pinkToOrange" size={"sm"} className="flex items-center bg-primary p-2 rounded-lg cursor-pointer hover:bg-opacity-80 active:bg-opacity-60 transition">
                <div className="bg-black/85 p-1 mr-4 rounded-lg text-xs">{balance}</div>
                <div className="text-black font-medium">{shortenPublicKey(address)}</div>
                <FaAngleDown className={`ml-2 transition-transform ${dropdownOpen && 'rotate-180'}`} />
            </Button>

            <div className={`${dropdownOpen ? 'block' : 'hidden'} absolute bg-primary rounded-lg backdrop-blur-lg shadow-md overflow-hidden mt-2 z-20 ${side === 'left' ? 'left-0' : 'right-0'} md:${mobileSide === 'left' ? 'left-0' : 'right-0'}`}>
                {children}
            </div>
        </div>
    );
};

export function DropdownItem({ active, onClick, children }) {
    return (
        <div onClick={onClick ?? (() => {})} className={`flex items-center p-3 cursor-pointer hover:bg-secondary hover:bg-opacity-10 active:bg-opacity-20 ${active === 'true' ? 'bg-white bg-opacity-5' : ''}`}>
            {children}
        </div>
    );
}

export default DropdownButton;
