import { Fragment, useCallback } from 'react';

import { delay } from '../../core/Delay';
import { PostReceiptDto, PreReceiptDto } from '../../storage/StorageModel';
import { Loader, useLoader } from '../layout/Loader';
import { useWallet } from '../wallet/WalletContext';

export interface ReceiptLoaderProps<T> {
	loader: () => Promise<T | null>;
	element: (receipt: T) => JSX.Element;
}

export function PostReceiptLoader(props: ReceiptLoaderProps<PostReceiptDto>) {
	return ReceiptLoader(props);
}

export function PreReceiptLoader(props: ReceiptLoaderProps<PreReceiptDto>) {
	return ReceiptLoader(props);
}

const ATTEMPS = 15;
const ATTEMP_DELAY = 10000;

function ReceiptLoader<T>(props: ReceiptLoaderProps<T>) {

	const wallet = useWallet();
	const account = wallet.tryGetAccount();

	const state = useLoader<{ receipt?: T, failed?: boolean }>(
		useCallback(async () => {
			if (!account) {
				return {};
			}
			for (let attemp = 0; attemp < ATTEMPS; attemp++) {
				const receipt = await props.loader.call(null);
				if (receipt) {
					return { receipt };
				}
				await delay(ATTEMP_DELAY);
			}
			return { failed: true };
		}, [props.loader, account]));

	return (
		<Loader state={state} loadingText="Waiting for blockchain confirmations. This may take several minutes..." element={(result => {
			if (!account) {
				return (
					<div>Please connect your wallet.</div>
				);
			}
			if (result.failed) {
				return (
					<div>
						Cannot receive receipt... Try again later or contact the administrator.
					</div>
				)
			}
			if (!result.receipt) {
				return <Fragment />;
			}
			return props.element(result.receipt);
		})} />
	);
}
