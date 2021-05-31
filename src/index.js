/* eslint-disable */

import { DeriveBalancesAccount } from '@polkadot/api-derive/types';
import styled from '@xstyled/styled-components';
import React, { useContext, useEffect, useState } from 'react';
import { Grid, Header, Icon, Popup, Tab } from 'semantic-ui-react';
import { isNumber } from 'lodash';
import { ApiContext } from 'src/context/ApiContext';
import formatBnBalance from 'src/util/formatBnBalance';

import { NotificationContext } from '../../context/NotificationContext';
import { useResetPasswordMutation } from '../../generated/graphql';
import { useRouter } from '../../hooks';
import { NotificationStatus } from '../../types';
import Button from '../../ui-components/Button';
import FilteredError from '../../ui-components/FilteredError';
import { Form } from '../../ui-components/Form';
import { web3Accounts, web3Enable,web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { stringToHex } from '@polkadot/util';
import { APPNAME } from 'src/global/appName';
import getNetwork from 'src/util/getNetwork';
import { DropdownProps, Select } from 'semantic-ui-react';

import ExtensionNotDetected from '../../components/ExtensionNotDetected';
import { UserDetailsContext } from '../../context/UserDetailsContext';
import { useAddressLinkConfirmMutation, useAddressLinkStartMutation, useAddressUnlinkMutation, useSetDefaultAddressMutation } from '../../generated/graphql';
import { handleTokenChange } from '../../services/auth.service';
import AddressComponent from '../../ui-components/Address';
import cleanError from '../../util/cleanError';
import getEncodedAddress from '../../util/getEncodedAddress';
import getExtensionUrl from '../../util/getExtensionUrl';
import AccountSelectionForm from '../../ui-components/AccountSelectionForm';
import Loader from '../../ui-components/Loader';

interface Props {
	className?: string
}

interface AccountsDetails {
	accounts: InjectedAccountWithMeta[];
	showAccounts: boolean;
	title: string;
}

const ResetPassword = ({ className }:Props): JSX.Element => {
	const router = useRouter();
	const [address, setAddress] = useState<string>('');
	const [stake, setStake] = useState<string>('');
	const [staked, setStaked] = useState<string>('0');
	const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
	const [extensionNotAvailable, setExtensionNotAvailable] = useState(false);
	const { queueNotification } = useContext(NotificationContext);
	const [balance, setBalance] = useState<string>('0');
	const { api, apiReady } = useContext(ApiContext);
	const [error, setError] = useState<string>('');

	const stakeMoreThenBalance = Number(stake) > Number(formatBnBalance(balance, { numberAfterComma: 5, withUnit: false }));

	useEffect(() => {
		if (!api) {
			return;
		}

		if (!apiReady) {
			return;
		}

		if (!address) {
			return;
		}

		let unsubscribe: () => void;

		console.log(address);

		api.derive.balances.account(address, (info : DeriveBalancesAccount) => {
			console.log(info.freeBalance?.toString());
			setBalance(info.freeBalance?.toString() || '0');
		})
			.then(unsub => { unsubscribe = unsub; })
			.catch(e => console.error(e));

		return () => unsubscribe && unsubscribe();
	}, [address, api, apiReady]);

	const onAccountChange = async (event: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
		const addressValue = data.value as string;
		setAddress(addressValue);

		if (accounts.length > 0) {
			const injected = await web3FromSource(accounts[0].meta.source);

			if (!api) {
				return;
			}

			if (!apiReady) {
				return;
			}

			api.setSigner(injected.signer);
		}
	};

	const getAccounts = async () => {
		const extensions = await web3Enable(APPNAME);

		if (extensions.length === 0) {
			setExtensionNotAvailable(true);
			return;
		} else {
			setExtensionNotAvailable(false);
		}

		const allAccounts = await web3Accounts();

		setAccounts(allAccounts);
	};

	const onMaxClick = (e: any) => {
		e.preventDefault();

		setStake(formatBnBalance(balance, { numberAfterComma: 5, withUnit: false }));
	}

	const doStake = () => {
		if (!api) {
			return;
		}

		if (!apiReady) {
			return;
		}

		if (!address) {
			return;
		}

		api.tx.balances
			.transfer('5DqzhxLWLRs3EYJFzXSaj2NCwYcuKPgqtrTRip4Keon83zVc', 1)
			.signAndSend(address, ({ status, events }) => {
				console.log(address);
				console.log(status, events);

				setStaked(`${Number(stake)*10}`);
  			});

	};

	const doUnStake = () => {
		if (!api) {
			return;
		}

		if (!apiReady) {
			return;
		}

		if (!address) {
			return;
		}

		api.tx.balances
			.transfer('5DqzhxLWLRs3EYJFzXSaj2NCwYcuKPgqtrTRip4Keon83zVc', 1)
			.signAndSend(address, ({ status, events }) => {
				console.log(address);
				console.log(status, events);

				setStaked(`${Number(stake)*10}`);
  			});

	};

	const panes = [
		{
			menuItem: 'Stake',
			render: () => {
				return (<Tab.Pane>
					<AccountSelectionForm
						title='Stake from account'
						accounts={accounts}
						address={address}
						withBalance={false}
						onAccountChange={onAccountChange}
					/>
					<Grid className={className} columns={3}>
						<Grid.Column>
							<h3>Wallet Balance</h3>
							<div><span className='header'>{formatBnBalance(balance, { numberAfterComma: 4, withUnit: false })}</span> WND </div>
							<div>≈US $ {formatBnBalance(balance, { numberAfterComma: 4, withUnit: false })}</div>
						</Grid.Column>
						<Grid.Column>
							<h3>Net APR</h3>
							<div className='apr'>15.5%</div>
						</Grid.Column>
						<Grid.Column>
							<h3>Staked Balance</h3>
							<div><span className='header'>{staked}</span> LWND </div>
							<div>≈US $ {staked}</div>
						</Grid.Column>
					</Grid>
					<Form.Group>
						<Form.Field width={16}>
							<label>Westend (<a onClick={onMaxClick} href="#">Max</a>)</label>
							<input
								className={stakeMoreThenBalance ? 'error' : ''}
								onChange={(e) => {
									const value = e.target.value;
									setStake(value);
								}}
								type="text"
								value={stake}
							/>
						</Form.Field>
					</Form.Group>
					<Form.Group>
						<Form.Field width={16}>
							<label>Liquid Westend</label>
							<input
								className={stakeMoreThenBalance ? 'error' : ''}
								onChange={() => {}}
								type="text"
								value={`≈ ${Number(stake)*10}`}
							/>
							{stakeMoreThenBalance && <span className={'errorText'}>Not enough balance</span>}
						</Form.Field>
					</Form.Group>
					<div>Max to stake: {formatBnBalance(balance, { numberAfterComma: 5, withUnit: false })}</div>
					<div>Price: 1 WND ≈ 10 LWND</div>
					<div>Network Fee: 0.00234 WND</div>

					<div className={'mainButtonContainer'}>
						<Button
							primary
							onClick={doStake}
						>
							Stake
						</Button>
					</div>
				</Tab.Pane>);
			}
		},
		{
			menuItem: 'Unstake',
			render: () => {
				return (<Tab.Pane>
					<AccountSelectionForm
						title='Unstake from account'
						accounts={accounts}
						address={address}
						withBalance={false}
						onAccountChange={onAccountChange}
					/>
					<Grid className={className} columns={3}>
						<Grid.Column>
							<h3>Wallet Balance</h3>
							<div><span className='header'>{formatBnBalance(balance, { numberAfterComma: 4, withUnit: false })}</span> WND </div>
							<div>≈US $ {formatBnBalance(balance, { numberAfterComma: 4, withUnit: false })}</div>
						</Grid.Column>
						<Grid.Column>
							<h3>Net APR</h3>
							<div className='apr'>15.5%</div>
						</Grid.Column>
						<Grid.Column>
							<h3>Staked Balance</h3>
							<div><span className='header'>{staked}</span> LWND </div>
							<div>≈US $ {staked}</div>
						</Grid.Column>
					</Grid>
					<Form.Group>
						<Form.Field width={16}>
							<label>Liquid Westend (<a onClick={onMaxClick} href="#">Max</a>)</label>
							<input
								className={stakeMoreThenBalance ? 'error' : ''}
								onChange={(e) => {
									const value = e.target.value;
									setStaked(value);
								}}
								type="text"
								value={staked}
							/>
						</Form.Field>
					</Form.Group>
					<Form.Group>
						<Form.Field width={16}>
							<label>Westend</label>
							<input
								className={stakeMoreThenBalance ? 'error' : ''}
								onChange={() => {}}
								type="text"
								value={`≈ ${Number(staked)/10}`}
							/>
							{stakeMoreThenBalance && <span className={'errorText'}>Not enough balance</span>}
						</Form.Field>
					</Form.Group>
					<div>Max to stake: {formatBnBalance(balance, { numberAfterComma: 5, withUnit: false })}</div>
					<div>Price: 10 LWND = 1 WND</div>
					<div>Network Fee: 0.00234 WND</div>
					<div>Received: ≈ {Number(staked)/10} WND</div>

					<div className={'mainButtonContainer'}>
						<Button
							primary
							onClick={doUnStake}
						>
							Un Stake
						</Button>
					</div>
				</Tab.Pane>);
			}
		}
	];

	if (extensionNotAvailable) {
		return (
			<Form className={className} standalone={false}>
				<Form.Group>
					<Form.Field width={16}>
						<ExtensionNotDetected />
					</Form.Field>
				</Form.Group>
			</Form>
		);
	}

	if (!apiReady) {
		return (
			<Grid className={className}>
				<Grid.Column only='tablet computer' tablet={2} computer={4} largeScreen={5} widescreen={6}/>
				<Grid.Column mobile={16} tablet={12} computer={8} largeScreen={6} widescreen={4}>
					<Loader/>
				</Grid.Column>
			</Grid>
		);
	}

	return (
		<Grid className={className}>
			<Grid.Column only='tablet computer' tablet={2} computer={4} largeScreen={5} widescreen={6}/>
			<Grid.Column mobile={16} tablet={12} computer={8} largeScreen={6} widescreen={4}>
				{accounts.length === 0 ? (
					<Form>
						<h3>To stake Connect with polkadot js extension</h3>
						<Form.Group>
							<Form.Field className='button-container'>
								<Button
									primary
									onClick={getAccounts}
									size={'large'}
								>
									Get accounts
								</Button>
							</Form.Field>
						</Form.Group>
					</Form>
				) : ( <Form>
					<Tab panes={panes} />
				</Form> )}
			</Grid.Column>
			<Grid.Column only='tablet computer' tablet={2} computer={4} largeScreen={5} widescreen={6}/>
		</Grid>
	);
};

export default styled(ResetPassword)`
	.mainButtonContainer{
		align-items: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.warning-text {
		margin-top: 0.5rem;
		color: red_secondary;
	}

	input.error {
		border-color: red_secondary !important;
	}

	.errorText {
		color: red_secondary;
	}

	span.header {
		color: black_primary;
		font-size: 2em;
		font-weight: 500;
	}

	.apr {
		width: 100px;
		height: 100px;
		border: 1px solid black;
		border-radius: 50px;
		text-align: center;
		vertical-align: middle;
		line-height: 100px;
		font-size: 1.5em;
		font-weight: 500;
	}
`;
