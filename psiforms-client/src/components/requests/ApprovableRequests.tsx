import { Fragment, useState } from 'react';

import { Arr } from '../../core/Arr';
import { HexFormatter } from '../../core/HexFormatter';
import { UnitsConverter } from '../../core/UnitsConverter';
import { BlockchainContractClient } from '../../storage/BlockchainContractClient';
import { FieldType, RequestStatus } from '../../storage/Model';
import { RequestDto } from '../../storage/StorageModel';
import { AppPage } from '../layout/AppPage';
import { Loader, useLoader } from '../layout/Loader';
import { SimpleMarkdown } from '../SimpleMarkdown';
import { ConnectYourWallet } from '../wallet/ConnectYourWallet';
import { useWallet } from '../wallet/WalletContext';
import { RequestStatusInfo } from './RequestStatusInfo';

export interface ApprovableRequestsProps {
	title: string;
	loader: () => Promise<RequestDto[]>;
}

export function ApprovableRequests(props: ApprovableRequestsProps) {
	const wallet = useWallet();
	const account = wallet.tryGetAccount();

	const [statuses, setStatuses] = useState<(boolean | null)[]>();
	const [processingFormId, setProcessingFormId] = useState<string>();
	const state = useLoader<RequestDto[]>(props.loader);

	function setStatus(status: boolean | null, requestId: string) {
		if (!state.value) {
			return;
		}
		const index = state.value.findIndex(r => r.id === requestId);
		const newStatuses = statuses ? [...statuses] : state.value.map(() => null);
		newStatuses[index] = (newStatuses[index] === status) ? null : status;
		setStatuses(newStatuses);
	}

	function onRequestIdClicked(request: RequestDto) {
		window.prompt('Request ID', request.id);
	}

	function onSenderClicked(request: RequestDto) {
		window.prompt('Sender Address', request.sender);
	}

	function buildEmailSubject(request: RequestDto): string {
		return `[PsiForms] Response for the request (${request.id})`;
	}

	async function save(formId: string) {
		if (processingFormId) {
			return;
		}
		if (!account) {
			alert('Your wallet is not connected.');
			return;
		}
		if (!state.value || !statuses) {
			return;
		}

		const newStatuses = state.value
			.map((request, index) => {
				return {
					request,
					status: statuses ? statuses[index] : null,
					index
				};
			})
			.filter(r => r.request.formId === formId && r.status !== null);

		setProcessingFormId(formId);
		try {
			const client = new BlockchainContractClient(account);

			await client.approveOrRejectRequests(formId,
				newStatuses.map(s => s.request.id),
				newStatuses.map(s => s.status as boolean));

			state.reload();
		} catch (e) {
			console.error(e);
			alert('Error: ' + (e as Error).message);
		} finally {
			setProcessingFormId(undefined);
		}
	}

	return (
		<AppPage>
			<ConnectYourWallet />
			<Loader state={state} element={(result => {
				const requestItems = result.map((request, requestIndex) => {
					return {
						request,
						status: statuses ? statuses[requestIndex] : null
					};
				});
				const forms = Arr.distinct(result.map(r => r.formId))
					.map(formId => {
						return {
							formId,
							hasAnyChange: requestItems.some(ri => ri.status !== null),
							requestItems: requestItems.filter(r => r.request.formId === formId)
						};
					});

				return (
					<section className="section">
						<div className="section-header">
							<h2>{props.title}</h2>

							<div className="actions">
								<button className="btn btn-white" title="Refresh" onClick={state.reload}>
									<i className="ico ico-refresh-black" />
								</button>
							</div>
						</div>
						<div className="section-body">
							{forms.length === 0 &&
								<div className="no-content">No requests.</div>}
							{forms.map(form =>
								<Fragment key={form.formId}>
									<div className="requests-header">
										<h3>{HexFormatter.format(form.formId)}</h3>

										{form.hasAnyChange &&
											<div className="actions">
												<button className="btn btn-black btn-large" onClick={() => save(form.formId)}>
													<i className={(form.formId === processingFormId)
														? 'ico ico-mr ico-refresh-white ico-rotating'
														: 'ico ico-mr ico-save-white'} />
													Save
												</button>
											</div>}
									</div>
									{form.requestItems.map(ri =>
										<div className="request-details" key={ri.request.id}>
											<div className="details">
												<div className="basic-info">
													<RequestStatusInfo status={ri.request.status} />
													{ri.request.value &&
														<strong className="value">{UnitsConverter.toDecimalETH(ri.request.value)} AVAX</strong>}
												</div>
												<div className="meta-info">
													<span className="meta">
														<em onClick={() => onRequestIdClicked(ri.request)}>{HexFormatter.format(ri.request.id)}</em>
														{', created '}
														<em>{ri.request.createdAt.toLocaleString()}</em>
														{' by '}
														<em onClick={() => onSenderClicked(ri.request)}>{HexFormatter.format(ri.request.sender)}</em>
													</span>
													{(ri.request.status === RequestStatus.pending) &&
														<span className="actions">
															{' '}
															<button className={'btn btn-small ' + (ri.status === true ? 'btn-black' : 'btn-white')} onClick={() => setStatus(true, ri.request.id)}>Approve</button>
															{' '}
															<button className={'btn btn-small ' + (ri.status === false ? 'btn-black' : 'btn-white')} onClick={() => setStatus(false, ri.request.id)}>Reject</button>
														</span>}
												</div>
											</div>
											<div className="values">
												<table>
													<tbody>
														<tr>
															<td width={'30%'}>E-mail</td>
															<td>
																<a href={'mailto:' + ri.request.email + '?subject=' + encodeURIComponent(buildEmailSubject(ri.request))}>{ri.request.email}</a>
															</td>
														</tr>
														{ri.request.fields.map((field, findex) =>
															<tr key={findex}>
																<td>{field.label}</td>
																<td>
																	{field.type === FieldType.text
																		&& <SimpleMarkdown text={field.value || ''} />}
																	{field.type === FieldType.number
																		&& <Fragment>{field.value}</Fragment>}
																	{field.type === FieldType.file && field.files
																		&& <Fragment>
																			{field.files.map((f, i) =>
																				<Fragment key={f.hash}>
																					{i > 0 && <br />}
																					<a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>{' '}
																					({Math.round(f.size / 1024)} KB)
																				</Fragment>)}
																		</Fragment>}
																</td>
															</tr>)}
													</tbody>
												</table>
											</div>
										</div>
									)}
								</Fragment>)}
						</div>
					</section>
				);
			})} />
		</AppPage>
	);
}
