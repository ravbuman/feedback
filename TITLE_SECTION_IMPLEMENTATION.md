# Excel Title Section with Dynamic Date Implementation

## Overview
Added professional title section above the Excel table with college name and dynamic report date based on activation period.

---

## Visual Structure

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃         PYDAH COLLEGE OF ENGINEERING(A)                      ┃ ← Row 1 (Title)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃    ACADEMIC FEEDBACK ANALYSIS REPORT-SEP-2025                ┃ ← Row 2 (Report Title)
┣━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━┫
┃BRANCH ┃YEAR & SEM┃SECTION  ┃SUBJECT  ┃STAFF     ┃COUNT     ┃ ← Row 3 (Header)
┣━━━━━━━╋━━━━━━━━━━╋━━━━━━━━━╋━━━━━━━━━╋━━━━━━━━━━╋━━━━━━━━━━┫
┃       ┃          ┃         ┃Maths    ┃SHIVA     ┃51        ┃ ← Row 4+ (Data)
┃  CSE  ┃   I-I    ┃    A    ┃C-Prog   ┃Jyothi    ┃51        ┃
┗━━━━━━━┻━━━━━━━━━━┻━━━━━━━━━┻━━━━━━━━━┻━━━━━━━━━━┻━━━━━━━━━━┛
```

---

## Features Implemented

### 1. ✅ **Title Row 1 - College Name**
- **Content**: "PYDAH COLLEGE OF ENGINEERING(A)"
- **Height**: 35px
- **Font**: Bold, size 16, black text
- **Background**: Light blue (#B4C7E7)
- **Alignment**: Centered (vertical + horizontal)
- **Borders**: Medium borders
- **Merged**: Spans all columns

### 2. ✅ **Title Row 2 - Report Title with Dynamic Date**
- **Content**: "ACADEMIC FEEDBACK ANALYSIS REPORT-[MONTH]-[YEAR]"
- **Height**: 30px
- **Font**: Bold, size 14, black text
- **Background**: Light blue (#B4C7E7)
- **Alignment**: Centered (vertical + horizontal)
- **Borders**: Medium borders
- **Merged**: Spans all columns

### 3. ✅ **Dynamic Date Logic**

**Date Source Priority:**
1. **If activation period selected** → Use period's start date
2. **If no period selected** → Use current date (fallback)

**Date Format:**
- Extract month and year from period start date
- Month: Convert to 3-letter uppercase (JAN, FEB, MAR, etc.)
- Year: 4-digit year
- Format: `MONTH-YEAR` (e.g., "SEP-2025")

---

## Implementation Details

### **Step 1: Store Selected Period**
```javascript
let selectedPeriod = null;
if (activationPeriod) {
  const form = await FeedbackForm.findById(formId);
  if (form && form.activationPeriods) {
    const period = form.activationPeriods.find(p => p.start.toISOString() === activationPeriod);
    if (period) {
      selectedPeriod = period; // Store for title generation
    }
  }
}
```

### **Step 2: Generate Dynamic Date**
```javascript
const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
let reportMonth = '';
let reportYear = '';

if (selectedPeriod && selectedPeriod.start) {
  const periodDate = new Date(selectedPeriod.start);
  reportMonth = monthNames[periodDate.getMonth()];
  reportYear = periodDate.getFullYear();
} else {
  // Fallback to current date if no period selected
  const currentDate = new Date();
  reportMonth = monthNames[currentDate.getMonth()];
  reportYear = currentDate.getFullYear();
}
```

### **Step 3: Insert Title Rows**
```javascript
// Insert 2 blank rows at the top
worksheet.insertRow(1, []); // Title 1
worksheet.insertRow(2, []); // Title 2

const totalColumns = columns.length;

// Title Row 1: College Name
const titleRow1 = worksheet.getRow(1);
titleRow1.height = 35;
worksheet.mergeCells(1, 1, 1, totalColumns);
const titleCell1 = worksheet.getCell(1, 1);
titleCell1.value = 'PYDAH COLLEGE OF ENGINEERING(A)';
titleCell1.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
titleCell1.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFB4C7E7' } // Light blue
};
titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };
titleCell1.border = {
  top: { style: 'medium', color: { argb: 'FF000000' } },
  left: { style: 'medium', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'medium', color: { argb: 'FF000000' } }
};

// Title Row 2: Report Title with Dynamic Date
const titleRow2 = worksheet.getRow(2);
titleRow2.height = 30;
worksheet.mergeCells(2, 1, 2, totalColumns);
const titleCell2 = worksheet.getCell(2, 1);
titleCell2.value = `ACADEMIC FEEDBACK ANALYSIS REPORT-${reportMonth}-${reportYear}`;
titleCell2.font = { bold: true, size 14, color: { argb: 'FF000000' } };
titleCell2.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFB4C7E7' } // Light blue
};
titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
titleCell2.border = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'medium', color: { argb: 'FF000000' } },
  bottom: { style: 'medium', color: { argb: 'FF000000' } },
  right: { style: 'medium', color: { argb: 'FF000000' } }
};
```

### **Step 4: Update Row Numbers**

Since we added 2 title rows, all row numbers shift down:

**Before:**
- Row 1: Header
- Row 2+: Data

**After:**
- Row 1: Title (College Name)
- Row 2: Title (Report)
- Row 3: Header
- Row 4+: Data

**Updated Code:**
```javascript
// Header row is now row 3
const headerRow = worksheet.getRow(3);

// Data starts from row 4
let groupStartRow = 4;
let currentRowNumber = 4;

// Skip title rows in styling
if (rowNumber <= 2 || row.height === 5) return;

// Skip title and header rows
if (rowNumber <= 3) return;

// Alternating colors start from row 4
if (rowNumber > 3 && (rowNumber - 3) % 2 === 0) {
  // Apply alternating color
}
```

---

## Date Examples

### **Example 1: Period Selected**
```
Activation Period Start: 2025-09-15
↓
Report Title: "ACADEMIC FEEDBACK ANALYSIS REPORT-SEP-2025"
```

### **Example 2: Different Month**
```
Activation Period Start: 2025-12-01
↓
Report Title: "ACADEMIC FEEDBACK ANALYSIS REPORT-DEC-2025"
```

### **Example 3: No Period Selected**
```
Current Date: 2025-10-16
↓
Report Title: "ACADEMIC FEEDBACK ANALYSIS REPORT-OCT-2025"
```

---

## Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Title Background | Light Blue | #B4C7E7 |
| Title Text | Black | #000000 |
| Header Background | Professional Blue | #4472C4 |
| Header Text | White | #FFFFFF |

---

## Styling Details

### **Title Rows:**
- **Height**: Row 1 = 35px, Row 2 = 30px
- **Font Size**: Row 1 = 16, Row 2 = 14
- **Font Weight**: Bold
- **Background**: Light blue (#B4C7E7)
- **Borders**: Medium black borders
- **Merged**: Spans all columns

### **Header Row (Row 3):**
- **Height**: 30px
- **Font Size**: 12
- **Font Weight**: Bold
- **Background**: Professional blue (#4472C4)
- **Text Color**: White
- **Borders**: Medium black borders

### **Data Rows (Row 4+):**
- **Height**: 25px
- **Alternating Colors**: Light blue (#F0F4FF) / White
- **Borders**: Thin light gray (#D0D0D0)

---

## Benefits

✅ **Professional Header** - Clear college branding
✅ **Dynamic Date** - Automatically shows correct period
✅ **Centered Title** - Spans entire table width
✅ **Visual Hierarchy** - Title → Report → Header → Data
✅ **Color Coded** - Light blue titles, blue header, alternating data rows
✅ **Print Ready** - Professional format for reports
✅ **Period Aware** - Shows exact period being analyzed

---

## Testing Checklist

- [ ] Export with activation period selected
- [ ] Verify title shows correct month-year from period
- [ ] Export without activation period
- [ ] Verify title shows current month-year
- [ ] Check title rows are merged across all columns
- [ ] Check title rows have light blue background
- [ ] Check college name is bold, size 16
- [ ] Check report title is bold, size 14
- [ ] Check header is now on row 3
- [ ] Check data starts from row 4
- [ ] Check alternating colors work correctly
- [ ] Open in Excel to verify all formatting

---

## Row Structure Summary

```
Row 1: PYDAH COLLEGE OF ENGINEERING(A)           [Title, Light Blue, 35px]
Row 2: ACADEMIC FEEDBACK ANALYSIS REPORT-SEP-2025 [Title, Light Blue, 30px]
Row 3: BRANCH | YEAR & SEM | SECTION | ...       [Header, Blue, 30px]
Row 4: CSE    | I-I        | A       | ...       [Data, White, 25px]
Row 5: (merged)|(merged)   |(merged) | ...       [Data, Light Blue, 25px]
Row 6: (merged)|(merged)   |(merged) | ...       [Data, White, 25px]
Row 7: ═══════════════════════════════════       [Separator, Gray, 5px]
Row 8: CSE    | I-I        | B       | ...       [Data, White, 25px]
```

---

## Files Modified

- **`backend/controllers/responseController.js`** - Added title section with dynamic date logic

---

## Result

The Excel export now has a professional title section that:
- ✅ Shows college name prominently
- ✅ Displays report title with dynamic month-year from activation period
- ✅ Centered and merged across all columns
- ✅ Professional light blue background
- ✅ Clear visual hierarchy
- ✅ Ready for printing and presentations

**Perfect for official reports!** 📊✨
