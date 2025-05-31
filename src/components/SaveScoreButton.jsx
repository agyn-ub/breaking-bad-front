import { useState, useEffect } from "react";
import { ethers } from "ethers";

const CONTRACT_ABI = [
    "function saveResult(uint256 score) external",
    "function highestScore(address user) view returns (uint256)"
];
const CONTRACT_ADDRESS = "0x0814533238C77dEb4feF6734443712219233327f";

const SaveScoreButton = ({ scores, account, onScoreUpdate, refreshFlag }) => {
    const [txHash, setTxHash] = useState(null);
    const [error, setError] = useState(null);
    const [latestScore, setLatestScore] = useState(null);
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // Calculate current score as the sum of all scores
    const currentScore = Array.isArray(scores) ? scores.reduce((a, b) => a + b, 0) : (typeof scores === 'number' ? scores : 0);

    // Fetch latest score from contract
    const fetchLatestScore = async (userAddress) => {
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const score = await contract.highestScore(userAddress);
            setLatestScore(Number(score));
            if (onScoreUpdate) onScoreUpdate(Number(score));
        } catch (err) {
            setLatestScore(null);
            if (onScoreUpdate) onScoreUpdate(null);
        } finally {
            setLoading(false);
        }
    };

    // Save score on-chain only if currentScore > latestScore
    const handleSaveScore = async () => {
        try {
            setInfo(null);
            setError(null);
            if (!account) {
                setError("Please connect your wallet on the main page.");
                return;
            }
            if (latestScore !== null && currentScore <= latestScore) {
                setInfo("Your current score is not higher than your latest on-chain score. No update needed.");
                return;
            }
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            const tx = await contract.saveResult(currentScore);
            setTxHash(tx.hash);
            setInfo(null);
            // Refetch latest score after saving
            await tx.wait();
            await fetchLatestScore(account);
        } catch (err) {
            setError(err.message);
            setTxHash(null);
        }
    };

    // Fetch latest score when account or refreshFlag changes
    useEffect(() => {
        if (window.ethereum && account) {
            fetchLatestScore(account);
        }
    }, [account, refreshFlag]);

    if (!account) {
        return <div className="mb-4 text-yellow-700 font-semibold">Connect your wallet on the main page to save your score on-chain.</div>;
    }

    return (
        <div className="mb-4">
            <div className="mb-2 text-blue-700 font-semibold">
                Current Score: {currentScore}
            </div>
            <button
                onClick={handleSaveScore}
                className="bg-green-600 text-black px-4 py-2 rounded"
                disabled={loading}
            >
                Save My Score On-Chain
            </button>
            {info && <p className="text-blue-600 mt-2">{info}</p>}
            {txHash && (
                <p className="text-green-600 mt-2">
                    Success! Tx: <a href={`https://evm-testnet.flowscan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a>
                </p>
            )}
            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
};

export default SaveScoreButton; 