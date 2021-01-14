const commandLineArgs = require('command-line-args');
const write = require('write');

const Pool = artifacts.require("Pool");
const LoanModule = artifacts.require("LoanModule");
const LoanProposalsModule = artifacts.require("LoanProposalsModule");
const LoanLimitsModule = artifacts.require("LoanLimitsModule");

const POOL_ADDRESS = `0x73067fdd366Cb678E9b539788F4C0f34C5700246`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const OPTION_DEFINITIONS = [
  { name: 'outfile', alias: 'o', type: String },
  { name: 'defaultableOnly', alias: 'd', type: Boolean }
];

const CSV_OPTIONS = {
    printHeader: true,
    separator: "\t",
    lineSeparator: "\n",
    columns: [
        {title:"borrower", field:"borrower"},
        {title:"debt", field:"debt"},
        {title:"borrowed", field:"lAmountBorrowed", convert: convertE18BNToString},
        {title:"unpaid", field:"lAmountLeft", convert: convertE18BNToString},
        {title:"lastPayment", field:"lastPayment", convert: convertTimestampToString},
        {title:"defaulted", field:"defaultExecuted", convert: convertBooleanToString},
        {title:"defaultable", field:"toBeDefaulted", convert: convertBooleanToString},
    ]    
};

async function main(options) {
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
        dbt.toBeDefaulted = !dbt.defaultExecuted && (dbt.lAmountLeft != 0) && (Number(dbt.lastPayment) < lastPaymentDeadline);
        debts.push(dbt);
        //console.log('Loan', dbt);
    }

    let csv; let loansListName;
    if(options.defaultableOnly) {
        loansListName = "Defaultable loans";
        csv = printLoansCSV(debts.filter(d=>d.toBeDefaulted), CSV_OPTIONS);
    }else{
        loansListName = "Loans";
        csv = printLoansCSV(debts, CSV_OPTIONS);
    }
    if(!options.outfile){
        console.log(`${loansListName}:\n`, csv);
    }else{
        write.sync(options.outfile, csv, {overwrite: true});
        console.log(`${loansListName} list saved to ${options.outfile}`);
    }
}
function printLoansCSV(debts, opts){
    let csv = "";
    if(opts.printHeader){
        for(let i = 0; i < opts.columns.length; i++){
            let col = opts.columns[i];
            csv += col.title;
            if(i != opts.columns.length){
                csv += opts.separator;
            }
        }
        csv += opts.lineSeparator;
    }
    for(d of debts) {
        for(let i = 0; i < opts.columns.length; i++){
            let col = opts.columns[i];
            let data = d[col.field];
            if(typeof col.convert == 'function'){
                data = col.convert(data);
            }
            csv += data;
            if(i != opts.columns.length){
                csv += opts.separator;
            }
        }
        csv += opts.lineSeparator;
    }
    return csv;
}

function convertE18BNToString(bn) {
    return web3.utils.fromWei(bn);
}
function convertTimestampToString(t){
    let d = new Date(Number(t)*1000);
    return d.toISOString();
}
function convertBooleanToString(b){
    return b?'yes':'no';
}

module.exports = async (callback) => {
    try{
        let opts = commandLineArgs(OPTION_DEFINITIONS, {partial:true});
        await main(opts);
        callback();
    }catch(e){callback(e)}
}
