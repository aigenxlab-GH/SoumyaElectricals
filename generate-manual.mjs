import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ImageRun
} from 'docx'
import fs from 'fs'

const SCREENSHOTS = './screenshots'

function screenshot(filename) {
  const imgPath = `${SCREENSHOTS}/${filename}.jpg`
  if (!fs.existsSync(imgPath)) return []
  const data = fs.readFileSync(imgPath)
  return [
    new Paragraph({
      spacing: { before: 80, after: 160 },
      children: [new ImageRun({
        type: 'jpg',
        data,
        transformation: { width: 620, height: 350 },
        altText: { title: filename, description: filename, name: filename }
      })]
    })
  ]
}

const NAVY   = '1a1f2e'
const AMBER  = 'b45309'
const WHITE  = 'FFFFFF'
const GOLD_BG  = 'FEF3C7'
const BLUE_BG  = 'DBEAFE'
const GREEN_BG = 'DCFCE7'
const GRAY_BG  = 'F3F4F6'
const LIGHT_GRAY = 'F9FAFB'

const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' }
const borders = { top: border, bottom: border, left: border, right: border }
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: NAVY, font: 'Arial' })]
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: NAVY, font: 'Arial' })]
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: '374151', font: 'Arial' })]
  })
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })]
  })
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: 'Note: ', bold: true, size: 20, font: 'Arial', color: AMBER }),
      new TextRun({ text, size: 20, font: 'Arial', color: '6B7280', italics: true })
    ]
  })
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })]
  })
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })]
  })
}

function spacer(size = 160) {
  return new Paragraph({ spacing: { after: size }, children: [] })
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
    children: []
  })
}

// placeholder removed — using real screenshots

// Credentials table
function credentialsTable() {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Role', 'Employee ID', 'Password', 'Name'].map(text =>
      new TableCell({
        borders,
        width: { size: 2340, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, font: 'Arial', color: WHITE })]
        })]
      })
    )
  })

  const users = [
    { role: 'Owner',    id: 'SE_5000', pass: '87654321',    name: 'Satish Kumar Kashyap', bg: GOLD_BG },
    { role: 'Manager',  id: 'SE_5001', pass: 'Soumya@2024', name: 'Rahul Sharma',         bg: BLUE_BG },
    { role: 'Manager',  id: 'SE_5002', pass: 'Soumya@2024', name: 'Priya Patel',          bg: BLUE_BG },
    { role: 'Manager',  id: 'SE_5003', pass: 'Soumya@2024', name: 'Amit Kumar',           bg: BLUE_BG },
    { role: 'Employee', id: 'SE_5004', pass: 'Soumya@2024', name: 'Deepa Nair',           bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5005', pass: 'Soumya@2024', name: 'Vikram Singh',         bg: LIGHT_GRAY },
    { role: 'Employee', id: 'SE_5006', pass: 'Soumya@2024', name: 'Sunita Rao',           bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5007', pass: 'Soumya@2024', name: 'Karan Mehta',          bg: LIGHT_GRAY },
    { role: 'Employee', id: 'SE_5008', pass: 'Soumya@2024', name: 'Anita Desai',          bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5009', pass: 'Soumya@2024', name: 'Suresh Yadav',         bg: LIGHT_GRAY },
    { role: 'Employee', id: 'SE_5010', pass: 'Soumya@2024', name: 'Meera Joshi',          bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5011', pass: 'Soumya@2024', name: 'Ravi Verma',           bg: LIGHT_GRAY },
    { role: 'Employee', id: 'SE_5012', pass: 'Soumya@2024', name: 'Kavita Reddy',         bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5013', pass: 'Soumya@2024', name: 'Mohan Das',            bg: LIGHT_GRAY },
    { role: 'Employee', id: 'SE_5014', pass: 'Soumya@2024', name: 'Shreya Gupta',         bg: GREEN_BG },
    { role: 'Employee', id: 'SE_5015', pass: 'Soumya@2024', name: 'Arun Pillai',          bg: LIGHT_GRAY },
  ]

  const dataRows = users.map(u =>
    new TableRow({
      children: [u.role, u.id, u.pass, u.name].map(text =>
        new TableCell({
          borders,
          width: { size: 2340, type: WidthType.DXA },
          shading: { fill: u.bg, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 160, right: 160 },
          children: [new Paragraph({
            children: [new TextRun({ text, size: 20, font: 'Arial', bold: text === u.id })]
          })]
        })
      )
    })
  )

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [headerRow, ...dataRows]
  })
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '374151' },
        paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [
    // ── Cover page ──
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        spacer(2880),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: 'Business Management System', bold: true, size: 56, font: 'Arial', color: NAVY })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: 'User Manual — Demo Guide', size: 32, font: 'Arial', color: '6B7280' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AMBER } },
          children: []
        }),
        spacer(320),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Reerth Technologies Pvt. Ltd.', bold: true, size: 28, font: 'Arial', color: NAVY })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'One login. Your entire business.', size: 24, font: 'Arial', color: AMBER, italics: true })]
        }),
        spacer(2400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'This is a demo application for evaluation purposes only.', size: 20, font: 'Arial', color: '9CA3AF', italics: true })]
        }),
        new Paragraph({ children: [new PageBreak()] })
      ]
    },
    // ── Main content ──
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
              children: [new TextRun({ text: 'Reerth Technologies Pvt. Ltd. — Business Management System', size: 18, font: 'Arial', color: '9CA3AF' })]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
              children: [
                new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: '9CA3AF' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '9CA3AF' }),
                new TextRun({ text: ' of ', size: 18, font: 'Arial', color: '9CA3AF' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: 'Arial', color: '9CA3AF' }),
              ]
            })
          ]
        })
      },
      children: [
        // ── Section 1: Credentials ──
        h1('1. Demo User Credentials'),
        body('This is a demo application. Use any of the login credentials below to explore the system. Each user type shows different features.'),
        spacer(120),
        credentialsTable(),
        spacer(120),
        note('The Employee ID is not case-sensitive (SE_5001 and se_5001 both work). The Password is case-sensitive.'),
        divider(),

        // ── Section 2: How to Log In ──
        h1('2. How to Log In'),
        ...screenshot('01-login'),
        spacer(120),
        numbered('Open the application in your web browser'),
        numbered('You will see the Login page'),
        numbered('Type your Employee ID in the first field (for example: SE_5001)'),
        numbered('Type your Password in the second field'),
        numbered('Click the Sign In button'),
        numbered('You will be taken to your Dashboard'),
        spacer(80),
        note('If you are logging in for the first time with a new account, you may be asked to change your password before continuing.'),
        divider(),

        // ── Section 3: Employee ──
        h1('3. Employee — What You Can Do'),
        body('Use any Employee ID from SE_5004 to SE_5015 with password Soumya@2024'),
        body('As an Employee, you can manage your own attendance, leaves, and view business information relevant to you.'),
        spacer(80),

        h3('Dashboard'),
        ...screenshot('19-employee-dashboard'),
        spacer(80),
        body('Your home screen. Shows how many timecards you have logged this month, how many leave days you have used, and your remaining leave balance. Use this to get a quick overview of your activity.'),

        h3('My Timecard'),
        ...screenshot('14-my-timecard'),
        spacer(80),
        body('This is where you record your daily attendance.'),
        bullet('Click "+ Add Timecard" to log attendance for a single day'),
        bullet('Select the date, write a short note about your work for the day, and click Save'),
        bullet('Use "Bulk Add Timecard" to log attendance for a range of dates at once — the system will automatically skip Sundays and public holidays'),
        bullet('You can edit or delete a timecard as long as it has not been approved yet'),

        h3('Overtime'),
        ...screenshot('14-my-timecard'),
        spacer(80),
        body('Log extra hours you have worked beyond your regular shift.'),
        bullet('Click "+ Add Overtime", pick the date, enter the number of hours, and save'),
        bullet('Your overtime payout is calculated automatically based on the company rate'),

        h3('My Leave'),
        ...screenshot('15-my-leave'),
        spacer(80),
        body('Apply for planned leave (day off).'),
        bullet('Click "Apply Leave", pick the date and write a reason, then submit'),
        bullet('Your leave balance shows how many days you have remaining'),
        bullet('You can apply for multiple days at once using the date range option'),
        bullet('Once a leave is approved by your manager, it cannot be cancelled — contact your manager if needed'),

        h3('My Calendar'),
        ...screenshot('16-my-calendar'),
        spacer(80),
        body('A monthly calendar view of your attendance.'),
        bullet('Green days = attendance approved'),
        bullet('Yellow days = attendance submitted, waiting for approval'),
        bullet('Blue days = leave'),
        bullet('Grey days = public holiday'),
        bullet('Navigate between months using the arrows at the top'),

        h3('Inventory'),
        ...screenshot('04-inventory'),
        spacer(80),
        body('View the current stock levels of all products. You can see how many units are available, reserved, and consumed. This is a read-only view — you cannot make changes here.'),

        h3('Quotations'),
        ...screenshot('05-quotations'),
        spacer(80),
        body('Create a price quotation to send to a customer.'),
        bullet('Click "New Quotation" to start'),
        bullet('Fill in the customer\'s name, phone, email, and address'),
        bullet('Select the products and enter the quantity'),
        bullet('The total amount is calculated automatically'),
        bullet('Submit the quotation for your manager\'s approval'),

        h3('Offers'),
        ...screenshot('06-offers'),
        spacer(80),
        body('View quotations that have been approved and finalised. These are the official price offers sent to customers.'),

        h3('My Payslips'),
        ...screenshot('20-employee-payslips'),
        spacer(80),
        body('View your monthly salary slips. Each slip shows your basic salary, any deductions (like leave without pay), and the final amount paid.'),
        divider(),

        // ── Section 4: Manager ──
        h1('4. Manager — What You Can Do'),
        body('Use SE_5001, SE_5002, or SE_5003 with password Soumya@2024'),
        body('As a Manager, you have all the features of an Employee plus the ability to approve or reject your team\'s requests.'),
        spacer(80),

        h3('Timecard Approvals'),
        ...screenshot('17-manager-timecard-approvals'),
        spacer(80),
        body('Review and approve daily attendance submitted by your team members.'),
        bullet('You will see a list of pending timecards from your team'),
        bullet('Click Approve to accept a timecard, or Reject to send it back'),
        bullet('Once approved, the timecard is locked and cannot be edited by the employee'),

        h3('Leave Approvals'),
        ...screenshot('18-manager-leave-approvals'),
        spacer(80),
        body('Review and approve leave requests from your team.'),
        bullet('Click Approve to grant the leave, or Reject to decline it'),
        bullet('If you reject a leave, the employee\'s leave balance is automatically restored'),

        h3('Payroll'),
        ...screenshot('08-payroll'),
        spacer(80),
        body('View and generate monthly salary slips for your team members.'),
        bullet('Select the month and click Generate to create payslips'),
        bullet('Each payslip is based on the number of approved attendance days'),
        divider(),

        // ── Section 5: Owner ──
        h1('5. Owner — What You Can Do'),
        body('Use SE_5000 with password 87654321'),
        body('As the Owner, you have full access to all features across the entire organisation.'),
        spacer(80),

        h3('Dashboard'),
        ...screenshot('02-owner-dashboard'),
        spacer(80),
        body('Shows company-wide pending approvals — how many manager timecards and leaves are waiting for your review. Click any tile to go directly to the approvals page.'),

        h3('Products'),
        ...screenshot('03-owner-products'),
        spacer(80),
        body('Manage the company\'s product catalogue.'),
        bullet('Click "+ Add Product" to add a new product with its name, description, category, and pricing'),
        bullet('Edit existing products to update prices or mark them as inactive'),
        bullet('Inactive products will not appear when creating quotations'),

        h3('Inventory'),
        ...screenshot('04-inventory'),
        spacer(80),
        body('View and update stock levels for all products.'),
        bullet('The table shows 8 upcoming weeks of stock forecast'),
        bullet('Enter quantities in the weekly cells to plan incoming stock'),
        bullet('Click Save to update the forecast'),
        bullet('Total Quantity, Available, Reserved, and Consumed columns update automatically'),

        h3('Users'),
        ...screenshot('07-owner-users'),
        spacer(80),
        body('Add and manage all employees and managers in the system.'),
        bullet('Click "+ Add User" to create a new account — an Employee ID is generated automatically'),
        bullet('Edit a user to update their details, change their manager, or deactivate their account'),
        bullet('Deactivated users cannot log in'),

        h3('Timecard Approvals'),
        ...screenshot('09-owner-timecard-approvals'),
        spacer(80),
        body('Approve or reject timecards submitted by your managers (not employees — managers handle their own teams).'),

        h3('Leave Approvals'),
        ...screenshot('10-owner-leave-approvals'),
        spacer(80),
        body('Approve or reject leave requests submitted by your managers.'),

        h3('Team Calendar'),
        ...screenshot('11-owner-team-calendar'),
        spacer(80),
        body('View the monthly attendance calendar for any employee or manager.'),
        bullet('Select a person from the dropdown at the top'),
        bullet('Navigate months using the arrows'),
        bullet('Colour coding is the same as the personal calendar'),

        h3('System Config'),
        ...screenshot('12-owner-config'),
        spacer(80),
        body('Configure company-wide settings.'),
        bullet('Annual Leave Days: how many leave days each employee gets per year'),
        bullet('Employee Overtime Rate: hourly payout rate for employee overtime'),
        bullet('Manager Overtime Rate: hourly payout rate for manager overtime'),
        bullet('Holidays: add or remove public holidays — these dates are automatically blocked for timecards and leaves'),
        bullet('Click Save after making changes'),

        h3('Payroll'),
        ...screenshot('08-payroll'),
        spacer(80),
        body('Generate and view salary slips for all staff across the company.'),
        divider(),

        // ── Section 6: Quick Tips ──
        h1('6. Quick Tips'),
        bullet('Your Employee ID is not case-sensitive — SE_5001 and se_5001 both work'),
        bullet('Your password IS case-sensitive — type it exactly as given'),
        bullet('Sundays and public holidays are automatically skipped when you log timecards or apply leave in bulk'),
        bullet('Once a timecard or leave is approved, it cannot be changed — contact your manager for corrections'),
        bullet('Your leave balance is topped up automatically on the 1st of every month'),
        bullet('Quotations must be approved by a manager before they become official Offers'),
        bullet('This is a demo application — data may be refreshed periodically'),
      ]
    }
  ]
})

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('C:/AIGenXLab/Projects/Soumya-Electricals/SoumyaElectricals/frontend/public/user-manual.docx', buffer)
  console.log('user-manual.docx created successfully!')
})
