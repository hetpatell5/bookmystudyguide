const xlsx = require("xlsx");
const { MainDegree, SubDegree, Subject } = require("../model/mysql");
const { clearAllCache } = require("../utils/redis");
const path = require("path");
const fs = require("fs");

const normalizeKey = (key) => {
  if (!key) return "";
  return key.toString().trim().toLowerCase().replace(/[\s_]/g, "");
};

const getRowValue = (row, ...possibleKeys) => {
  const normalizedPossible = possibleKeys.map(normalizeKey);
  for (const key of Object.keys(row)) {
    if (normalizedPossible.includes(normalizeKey(key))) {
      return row[key] ? row[key].toString().trim() : "";
    }
  }
  return "";
};

exports.uploadExcel = async (req, res) => {
  let filePath = "";
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { type } = req.body; // 'main', 'sub', 'subject'
    if (!['main', 'sub', 'subject'].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type specified" });
    }

    filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: "Excel file is empty" });
    }

    let results = [];
    let errors = [];

    if (type === 'main') {
      const degrees = data.map(row => {
        const name = getRowValue(row, "name", "Main Degree", "Main Degree Name");
        const description = getRowValue(row, "description", "Description", "Desc");
        const color = getRowValue(row, "color", "Color") || "#6366f1";
        const icon = getRowValue(row, "icon", "Icon") || "BookOpen";
        return { name, description, color, icon };
      }).filter(d => d.name);

      if (degrees.length === 0) throw new Error("No valid names found in Excel");
      results = await MainDegree.bulkCreate(degrees);
    } 
    
    else if (type === 'sub') {
      for (const row of data) {
        const name = getRowValue(row, "name", "Sub Degree", "Sub Degree Name");
        const mainDegreeName = getRowValue(row, "mainDegreeName", "Main Degree", "Main Degree Name");

        if (!name || !mainDegreeName) {
          errors.push(`Row missing name or mainDegreeName: ${JSON.stringify(row)}`);
          continue;
        }

        const mainDegree = await MainDegree.findOne({ 
          where: { name: mainDegreeName } 
        });
        if (!mainDegree) {
          errors.push(`Main Degree not found: ${mainDegreeName}`);
          continue;
        }

        results.push({ name, mainDegreeId: mainDegree.id });
      }

      if (results.length > 0) {
        results = await SubDegree.bulkCreate(results);
      }
    } 
    
    else if (type === 'subject') {
      for (const row of data) {
        const name = getRowValue(row, "name", "Subject", "Subject Name");
        const mainDegreeName = getRowValue(row, "mainDegreeName", "Main Degree", "Main Degree Name");
        const subDegreeName = getRowValue(row, "subDegreeName", "Sub Degree", "Sub Degree Name");
        const year = getRowValue(row, "year", "Year");
        const semester = getRowValue(row, "semester", "Semester");
        const course = getRowValue(row, "course", "Course", "Course Name");

        if (!name || !mainDegreeName || !subDegreeName || !year || !semester || !course) {
          errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          continue;
        }

        const mainDegree = await MainDegree.findOne({ 
          where: { name: mainDegreeName } 
        });
        if (!mainDegree) {
          errors.push(`Main Degree not found: "${mainDegreeName}"`);
          continue;
        }

        const subDegree = await SubDegree.findOne({ 
          where: { 
            name: subDegreeName,
            mainDegreeId: mainDegree.id 
          }
        });
        if (!subDegree) {
          errors.push(`Sub Degree not found: "${subDegreeName}" for "${mainDegreeName}"`);
          continue;
        }

        results.push({
          name,
          mainDegreeId: mainDegree.id,
          subDegreeId: subDegree.id,
          year,
          semester,
          course
        });
      }

      if (results.length > 0) {
        results = await Subject.bulkCreate(results);
      }
    }

    // Cleanup uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const successCount = results.length;
    const errorCount = errors.length;
    let finalMessage = `${successCount} records processed successfully.`;
    
    if (successCount > 0) {
        await clearAllCache();
    }

    if (errorCount > 0) {
      finalMessage += ` ${errorCount} rows failed. Check console for details.`;
      console.warn(`Excel upload partial failure: ${errorCount} errors`, errors);
    }

    res.status(200).json({
      success: true,
      message: finalMessage,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error("Excel Upload Error:", err);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadSample = async (req, res) => {
  try {
    const { type } = req.params;
    let data = [];
    let filename = "";

    if (type === 'main') {
      data = [{ name: "Example Degree", description: "Optional description", color: "#3498db", icon: "Book" }];
      filename = "sample_main_degrees.xlsx";
    } else if (type === 'sub') {
      data = [{ name: "Example Sub Degree", mainDegreeName: "Example Degree" }];
      filename = "sample_sub_degrees.xlsx";
    } else if (type === 'subject') {
      data = [{
        name: "Example Subject",
        mainDegreeName: "Example Degree",
        subDegreeName: "Example Sub Degree",
        year: "1st Year",
        semester: "1st Semester",
        course: "Example Course"
      }];
      filename = "sample_subjects.xlsx";
    } else {
      return res.status(400).json({ success: false, message: "Invalid sample type" });
    }

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sample");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
