'use strict';
// Everything on the public pages that you may want to change lives here.
module.exports = {
  name: 'St. John the Baptist Self Help Group',
  short: 'SJB Riruta SHG',
  phone: '0746 789 604',
  phoneIntl: '254746789604',
  email: 'shg@riruta.caritasnairobishp.org',
  place: 'St. John the Baptist Catholic Church, Riruta',
  directions: 'Off Naivasha Road, near Naivas Supermarket, along Kikuyu Road.',
  po: 'P. O. Box 21243 - 00505, Nairobi',
  hours: [['Monday to Friday', '8.00 AM to 5.00 PM'], ['Saturday', '8.30 AM to 1.00 PM']],
  paybill: '8998990',
  account: '505200#IDnoMS',

  mission: 'To enhance the socio-economic welfare of communities within Riruta and beyond through savings mobilization, provision of affordable credit, capacity building and exemplary customer service driven by innovative and prudent management.',
  vision: 'An economically empowered and unified community.',
  objectives: [
    'Encourage thrift by giving members a way to accumulate savings.',
    'Help each member improve their socio-economic conditions.',
    'Provide credit for improvement, production or both.',
    "Keep members' funds safe and sound.",
    'Educate members continuously on the proper use of credit.',
    'Carry out the functions of a group under the guidelines of the Archdiocese of Nairobi Caritas Registered Trustees.'
  ],
  benefits: [
    'Surplus distributed every financial year after audit',
    'Benevolent fund',
    'Education days and team building',
    'Keep your membership if you change residence',
    'Access to multiple loan products'
  ],

  products: [
    { name: 'Development loan', img: '/img/dev.jpg', text: 'All-purpose loan for individuals or corporates to finance development projects. Repayment follows the schedule below.' },
    { name: 'Business loan', img: '/img/biz.svg', text: 'For ongoing businesses only, available to individuals and corporates. Repayment follows the schedule below.' },
    { name: 'Emergency loan', img: '/img/emergency.jpg', text: 'For sickness, accidents, disasters and other surprises. Up to Ksh 100,000, repaid within 12 months. Not open to corporates.' },
    { name: 'Education loan', img: '/img/edu.svg', text: 'School fees and related costs, released once a valid fee structure is presented. Up to 24 months for post-secondary, 12 months for primary and secondary. Not open to corporates.' },
    { name: 'Agribusiness loan', img: '/img/agri.svg', text: "For agricultural purposes only, repaid within 24 months, with features tailored to members' needs." },
    { name: 'Christmas savings', img: '/img/xmas.jpg', text: 'Set money aside all year for a stress-free festive season.' }
  ],
  special: [
    { name: 'Youth loan', img: '/img/youth.jpg', text: 'For members aged 18 to 35.' },
    { name: 'Senior citizen loan', img: '/img/senior.jpg', text: 'For members aged 65 and above.' },
    { name: 'PLWD loan', img: '/img/plwd.jpg', text: 'For persons living with disabilities.' }
  ],
  schedule: [
    ['Below 49,999', '2 years'], ['50,000 to 299,999', '3 years'], ['300,000 to 499,999', '4 years'],
    ['500,000 to 999,999', '5 years'], ['1,000,000 to 2,999,999', '7 years'], ['Above 3,000,000', '8 years']
  ],

  steps: [
    ['Gather your documents', 'See the list for your membership type below.'],
    ['Register', 'Pay the registration fee of Ksh 300 at our office.'],
    ['Save monthly', 'Contribute at least Ksh 50 a month, and more when you can.'],
    ['Borrow after 6 months', 'After six consecutive months of contributions, you qualify to apply for a loan.']
  ],
  docs: [
    ['Individual', ['National ID or passport', 'KRA PIN', 'Passport-size photo', 'Next of kin ID', 'Beneficiary details', 'Registration fee']],
    ['Corporate', ['List of all group members', 'ID or passport copies of all signatories', 'Passport photos of all signatories', 'Registration certificate, where applicable', 'Group by-laws or constitution']],
    ['Minor savings account', ['ID or passport of guardian and next of kin', 'Birth certificate, birth notification or baptism card', 'Passport photos of the minor and guardian']]
  ],

  faqs: [
    ['Who can become a member?', "Eligible individuals and corporates who meet the group's registration requirements."],
    ['How much should I save, and can I withdraw?', 'The minimum is Ksh 50 a month, and you can deposit as often as you like. Savings cannot be withdrawn. They serve as security for loans, subject to group policy.'],
    ['When do I qualify for a loan, and how much can I borrow?', 'New members qualify after 6 months of savings. You can borrow up to 5 times your savings, subject to loan assessment, security and applicable terms.'],
    ['What are the interest rates?', 'Standard loans: 1% per month on a reducing balance. Special loan products (youth, senior citizens, PLWD): 0.8% per month on a reducing balance.'],
    ['How long do I have to repay?', 'Between 2 and 8 years, depending on the loan amount. See the schedule on the Loans page.'],
    ['Can I have more than one loan?', 'Yes, subject to qualification and available capacity. A refinance may be considered after you have repaid 50% of an existing loan.'],
    ['What do I need to apply for a loan?', 'A completed, signed loan application form and a copy of your ID. Bank statements are required for loans above Ksh 1 million.'],
    ['How many guarantors do I need?', 'There is no fixed number. Guarantorship follows the "shilling for a shilling" security principle. You may guarantee more than one member, subject to the applicable requirements.'],
    ['What charges apply to loans?', 'Loan security fund (LSF) or insurance, usually 1% of the loan. Loan application form, Ksh 100. CRB check, Ksh 100. Transaction charge per transfer: Ksh 50 for M-PESA or Ksh 75 for bank.'],
    ['What happens if a payment is missed or a borrower defaults?', "A missed repayment puts the loan in arrears and may trigger the recovery process. Recovery follows group policy, including offsetting the outstanding amount against the borrower's and/or guarantors' savings where applicable."],
    ['When does an account become dormant, and can I reactivate it?', 'After 6 months of inactivity. You can reactivate it by making a qualifying deposit and meeting the applicable requirements.'],
    ['What is the Benevolent Fund?', 'A welfare benefit under group policy that gives financial assistance after the death of a qualifying member, contributor or minor member, subject to the applicable terms.']
  ]
};
