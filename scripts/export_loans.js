const commandLineArgs = require('command-line-args');

const Pool = artifacts.require("Pool");
const LoanModule = artifacts.require("LoanModule");
const LoanProposalsModule = artifacts.require("LoanProposalsModule");
const LoanLimitsModule = artifacts.require("LoanLimitsModule");

const POOL_ADDRESS = `0x73067fdd366Cb678E9b539788F4C0f34C5700246`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
    const pool = await Pool.at(POOL_ADDRESS);
    let loanModuleAddress = await pool.get('loan', {from:ZERO_ADDRESS});
    //let loanLimitsModuleAddress = await pool.get('loan_limits');
    let loanProposalsModuleAddress = await pool.get('loan_proposals', {from:ZERO_ADDRESS});
    console.log('Loan module:', loanModuleAddress);
    console.log('Loan proposals module:', loanProposalsModuleAddress);
    const loanModule = new web3.eth.Contract(LoanModule.abi, loanModuleAddress);
    //const loanProposalsModule = LoanProposalsModule.at(loanProposalsModuleAddress);
    const loanProposalsModule = new web3.eth.Contract(LoanProposalsModule.abi, loanProposalsModuleAddress);

    const debtRepayDeadlinePeriod = await loanModule.methods['DEBT_REPAY_DEADLINE_PERIOD']().call({from:ZERO_ADDRESS});
    console.log('Loan repay deadline period:', debtRepayDeadlinePeriod);
    let lastPaymentDeadline = Math.round(Date.now()/1000) - Number(debtRepayDeadlinePeriod); //All debts with lastPayment before this date are expired

    let debts = new Array();
    let executedProposals = await loanProposalsModule.getPastEvents('DebtProposalExecuted', { fromBlock: 0, toBlock: 'latest' });
    console.log(`Loaded ${executedProposals.length} loans`);

    for(ep of executedProposals){
        let dbt = {
            borrower: ep.returnValues.sender,
            debt: ep.returnValues.debt,
            lAmountBorrowed: ep.returnValues.lAmount,
        };
        let dbtInfo = await loanModule.methods['debts(address,uint256)'](dbt.borrower, dbt.debt).call({from:ZERO_ADDRESS});
        //console.log(dbtInfo);
        dbt.lAmountLeft = dbtInfo.lAmount;
        dbt.lastPayment = dbtInfo.lastPayment;
        dbt.defaultExecuted = dbtInfo.defaultExecuted;
        dbt.isExpired = (Number(dbt.lastPayment) < lastPaymentDeadline);
        debts.push(dbt);
        console.log('Loan', dbt);
    }
}


module.exports = async (callback) => {
    try{
        await main();
        callback();
    }catch(e){callback(e)}
}
