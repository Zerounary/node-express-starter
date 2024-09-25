const oracledb = require("oracledb");

async function run(query) {
  const conn = await oracledb.getConnection({
    user: "bosnds3",
    password: "abc123",
    connectString: "app.burgeonerp.cn:22990/testorcl",
  });
  const res = await conn.execute(query);
  let columns = res.metaData.map((meta) => ({
    name: meta.name,
    ty: meta.dbTypeName,
    nullable: meta.nullable,
  }));
  console.dir(
    {
      columns,
      rows: res.rows,
    },
    { depth: null }
  );
  await conn.close();
}

run("select id, name from ad_table where rownum < 10");
