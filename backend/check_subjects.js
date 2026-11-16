const { Subject, SubDegree } = require("./model/mysql");
const { sequelize } = require("./config/mysqlDb");

async function check() {
  try {
    const subDegrees = await SubDegree.findAll({ limit: 5 });
    console.log("SubDegrees sample:", JSON.stringify(subDegrees, null, 2));

    const subjects = await Subject.findAll({ limit: 5 });
    console.log("Subjects sample:", JSON.stringify(subjects, null, 2));

    if (subDegrees.length > 0) {
      const subId = subDegrees[0].id;
      const count = await Subject.count({ where: { subDegreeId: subId } });
      console.log(`Subjects count for SubDegree ${subId}: ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
