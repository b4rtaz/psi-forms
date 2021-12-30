import { Fragment, useState } from 'react';

import { HexFormatter } from '../../core/HexFormatter';
import { useWallet } from '../wallet/WalletContext';

export function WalletConnector() {
	const wallet = useWallet();

	const [isOpened, setIsOpened] = useState(() => false);

	async function connectToMetamask() {
		try {
			await wallet.connect();
			setIsOpened(false);
		} catch (e) {
			alert('Error: ' + (e as Error).message);
		}
	}

	async function togglePopup() {
		if (!wallet.isConnected()) {
			setIsOpened(true);
		} else {
			await wallet.disconnect();
		}
	}

	function closePopup() {
		setIsOpened(false);
	}

	const isConnected = wallet.isConnected();
	return (
		<Fragment>
			{isOpened &&
				<div className="wallet-connector">
					<h4>Sellect your Wallet</h4>

					<div className="wallets">
						<button className="wallet wallet-metamask" onClick={connectToMetamask}><strong>MetaMask</strong></button>
					</div>

					<div className="cancel">
						<button className="btn btn-black" onClick={closePopup}>Cancel</button>
					</div>
				</div>}
			{isConnected &&
				<Fragment>
					<button className="btn btn-gray">
						<i className="ico ico-mr ico-chain-black" />
						{wallet.getAccount().network.name}
					</button>
					{' '}
				</Fragment>}
			<button className="btn btn-black" onClick={togglePopup}>
				<i className="ico ico-mr ico-wallet-white" />
				{isConnected ? HexFormatter.formatHex(wallet.getAccount().address) : 'Connect wallet'}
			</button>
		</Fragment>
	);
}
