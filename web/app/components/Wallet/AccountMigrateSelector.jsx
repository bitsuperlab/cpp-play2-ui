import React from "react";
import {Link, PropTypes} from "react-router";import ReactDOM from "react-dom";
import Immutable from "immutable";
import DashboardList from "../Dashboard/DashboardList";
import counterpart from "counterpart";
import Translate from "react-translate-component";
import ps from "perfect-scrollbar";
import AssetName from "../Utility/AssetName";
import assetUtils from "common/asset_utils";
import AccountStore from "stores/AccountStore";
import notify from "actions/NotificationActions";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import {ChainStore} from "graphenejs-lib";
import FormattedAsset from "components/Utility/FormattedAsset";
import EthAddress from "ethereum-address";
import cname from "classnames";
import WalletActions from "actions/WalletActions";


@BindToChainState()
class AccountMigrateSelector extends React.Component {
    static contextTypes = {
        location: React.PropTypes.object,
        history: PropTypes.history
    };

    static propTypes = {
        linkedAccounts: ChainTypes.ChainAccountsList.isRequired
    };

    constructor() {
        super();
        this.state = {
            accounts_to_migrate: [],
            eth_address: "",
            migrate_ready: false,
            error: ""
        };
    }

    componentDidUpdate(prevProps, prevState){
        console.debug(this.state.accounts_to_migrate);
        if (prevState !== this.state)
            this.checkReady();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.linkedAccounts !== this.props.linkedAccounts ||
            nextState.eth_address !== this.state.eth_address ||
            nextState.migrate_ready !== this.state.migrate_ready ||
            nextState.accounts_to_migrate !== this.state.accounts_to_migrate ||
            nextState.error !== this.state.error
        );
    }

    onSelectAccount(account_id) {
        var checked = this.state.accounts_to_migrate.slice();
        let index = checked.findIndex(e => e == account_id)
        // toggle
        // if found, remove it; otherwise add
        if (index > -1) {
            checked.splice(index, 1);
        } else {
            checked.push(account_id);
        }

        this.setState({ accounts_to_migrate: checked });
        // BalanceClaimActiveActions.setSelectedBalanceClaims(checked)
    }

    onEthFieldChange(evt){
        this.setState({eth_address: evt.target.value.trim()});
    }

    checkReady(){
        let addressPresent = this.state.eth_address != '';
        let addressValid = EthAddress.isAddress(this.state.eth_address);
        let accountSelected = true;
        let ready = addressPresent && addressValid && accountSelected;

        if (!addressPresent) {
            this.setState({error: counterpart.translate("wallet.error_empty_eth_address")});
        } else if (!addressValid){
            this.setState({error: counterpart.translate("wallet.error_wrong_eth_address")});
        } else if (!accountSelected){
            this.setState({error: counterpart.translate("wallet.error_no_accounts_selected")});
        } else {
            this.setState({error: ''});
        }

        console.debug("address ready ("+this.state.eth_address+")", addressValid);
        console.debug('account ready', accountSelected);
        this.setState({migrate_ready: ready});
        return ready;
    }

    onMigrateAccounts(evt){
        // check eth address
        if (this.checkReady()) {
            console.debug('process migrate');
            WalletActions.migrateAccounts(this.state.accounts_to_migrate, this.state.eth_address, true)
        } else {
            console.debug('not ready');
        }
    }

    onBack(evt) {
        evt.preventDefault();
        window.history.back();
    }


    render() {
        let {linkedAccounts} = this.props;
        let myAccounts = linkedAccounts
            .filter( account => !!account && AccountStore.isMyAccount(account) )
            .map( account => {
              let account_balance = 0;
              let account_balances = account.get("balances");
              account_balances.forEach( balance => {
                  let balanceAmount = ChainStore.getObject(balance);
                  if (!balanceAmount || balanceAmount.get('asset_type') != '1.3.0' || !balanceAmount.get("balance")) {
                      account_balance += 0;
                  } else {
                      account_balance += balanceAmount.get('balance');
                  }
              });

              return {"name": account.get('name'), "id": account.get('id'), "balance": account_balance};
            })

        let accountCount = myAccounts.length;

        // my don't have currentAccount and no linked accounts
        // will redirect to create-account page
        let currentAccount = AccountStore.getState().currentAccount;

        if (!currentAccount && accountCount == 0) {
          notify.addNotification({
              message: counterpart.translate("dashboard.not_accessible"),
              level: "warning", autoDismiss: 3
          });

          // redirect to create-account route
          this.context.history.pushState(null, '/create-account');
        }

        let introText = <p style={{textAlign: "left"}} dangerouslySetInnerHTML={{__html: counterpart.translate("wallet.migrate_explain")}}></p>

        let selectorTable = <div className="content-block">
            <table className="table">
                <thead><tr>
                    <th>{ /* C H E C K B O X */ }</th>
                    <th style={{textAlign: "center"}}><Translate content="account.name" /></th>
                    <th style={{textAlign: "center"}}><Translate content="exchange.balance" /></th>
                </tr></thead>
                <tbody>
                {myAccounts.map( (account, i) => {
                    return (<tr key={i}>
                        <td>
                            <input type="checkbox"
                                checked={!!this.state.accounts_to_migrate.includes(account["id"])}
                                onChange={this.onSelectAccount.bind(this, account["id"])}
                                disabled={!!account["balance"]==0} />
                        </td>
                        <td> {account["name"]} </td>
                        <td style={{textAlign: "right"}}>
                            <FormattedAsset color="info"
                                amount={account["balance"]}
                                asset={"1.3.0"}/>
                        </td>
                        <td style={{textAlign: "right"}}>
                        </td>
                    </tr>)
                })}
                </tbody>
            </table>
        </div>

        let ethField = <div className="row"><form className="eth-address-field">
            <label className="horizontal"><Translate content="wallet.your_eth_address"/> &nbsp; &nbsp;
                <input type="text" placeholder={counterpart.translate('wallet.eth_address_placeholder')}
                    value={this.state.eth_address}
                    onChange={this.onEthFieldChange.bind(this)}
                    autoComplete="off" size="42"
                    tabIndex={1} />
                    <div style={{display:"inline-block",marginLeft:"5px"}}>
                        { this.state.eth_address != '' ? (
                            !!EthAddress.isAddress(this.state.eth_address) ?
                            <label className="label success">&#10003;</label>
                                :
                            <label className="label alert">&#x2717;</label>
                            ) : null
                        }
                    </div>

                    <div className="error-area error">
                        <span>{this.state.error}</span>
                    </div>
            </label>
        </form></div>

        let actionBtn = <div className="row">
            <div className={ cname("button success", {disabled: !this.state.migrate_ready}) }
                onClick={this.onMigrateAccounts.bind(this)}>
                <Translate content="wallet.btn_migrate" />
            </div>
            <div className="button cancel" onClick={this.onBack.bind(this)}><Translate content="wallet.cancel" /></div>
        </div>;

        // if no accounts found
        if( accountCount == 0) return <div><Translate content="wallet.no_accounts" /></div>;

        return <div>
            {introText}
            {selectorTable}
            {ethField}
            {actionBtn}
        </div>

    }

}

export default AccountMigrateSelector;
