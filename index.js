// IMPORTING MODULES
require("dotenv").config();
const db = require("./config/dbconn");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const {genSalt, compare, hash } = require("bcrypt");
const app = express();
const router = express.Router();
const port = parseInt(process.env.PORT) || 4000;

// SERVER LISTEN
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// allow access to fetch data from the api externally by  Seting header
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    next();
});

app.use(cors({
    origin: ['http://127.0.0.1:8080', 'http://localhost:8080'],
    credentials: true
}));

// add cors to the app variable
app.use(
    router,
    cors(),
    express.json(),
    express.urlencoded({
        extended: true,
    })
);

// connect to database (TO MAKE SURE ITS CONNECTED).
db.connect( (err) => {
    if(err){
        console.log(`mySQL is not connected...<br>
        ${err}`)
    } else{
        console.log('mySQL connected...')
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HOME PAGE ROUTER
router.get("/", (req, res) => {
    res.status(200).sendFile("./views/index.html", {
        root: __dirname
    });
});

// LOGIN PAGE ROUTER
router.get("/login", (req, res) => {
    res.status(200).sendFile("./views/login.html", {
        root: __dirname
    });
});

// REGISTER PAGE ROUTER
router.get("/register", (req, res) => {
    res.status(200).sendFile("./views/register.html", {
        root: __dirname
    });
});

//*PRODUCTS PAGE ROUTER*//
router.get("/productss", (req, res) => {
    res.status(200).sendFile("./views/products.html", {
        root: __dirname
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*LOGIN USER*//

app.post('/login', bodyParser.json(),
    (req, res)=> {
    try{
        // Get email and password
        const { email, password } = req.body;
        const strQry =
        `
        SELECT email, password
        FROM users
        WHERE email = '${email}';
        `;
        db.query(strQry, async (err, results)=> {
            if(err) throw err;
            const key = jwt.sign(JSON.stringify(results[0]), process.env.secret);
            res.json({
                status: 200,
                results: key,
            });
            localStorage.setItem('key', JSON.stringify(key));
            key = localStorage.getItem('key');
            switch(true){
                case (await compare(password,results[0].password)):
                res.redirect('/productss')
                break
                default:
                console.log("Bye");
            }
        })
    }catch(e) {
        console.log(`From login: ${e.message}`);
    }
});


//*USER REGISTRATION*//
//*ADD NEW USER*//

app.post("/register", bodyParser.json(), (req, res) => {
    let emails = `SELECT email FROM users WHERE ?`;
    let email = {
        email: req.body.email
    };
    db.query(emails, email, async (err, results) => {
        if (err) throw err;
        // VALIDATION
        if (results.length > 0) {
            res.send("The provided email/phone number exists. Please enter another one");
        } else {
            const bd = req.body;
            console.log(bd);
            let generateSalt = await genSalt();
            bd.password = await hash(bd.password, generateSalt);
            // QUERY
            const strQry = `
            INSERT INTO users(firstName, lastName, email, password, phone, province, country)
            VALUES(?, ?, ?, ?, ?, ?, ?);
            `;
            //
            db.query(
                strQry,
                [
                    bd.firstName,
                    bd.lastName,
                    bd.email,
                    bd.password,
                    bd.phone,
                    bd.province,
                    bd.country
                ],
                (err, results) => {
                    if (err) throw err;
                    res.send(`${results.affectedRows} NEW USER ADDED`);
                }
            );
        }
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------USER ROUTES-------------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*GET ALL USERS*//

router.get("/users", (req, res) => {
    const query = `SELECT * FROM users`;
    db.query(query, (err, results) => {
        if (err) throw err;
        if (results.length < 1) {
            res.json({
                status: 204,
                results: "There are no users",
            });
        } else {
            res.json({
                status: 200,
                results: results,
            });
        }
    });
});

//*GET A USER WITH A SPECIFIC ID*//

router.get("/users/:id", (req, res) => {
    const query = `SELECT * FROM users WHERE id=?`;
    db.query(query, req.params.id, (err, results) => {
        if (err) throw err;
        if (results.length < 1) {
            res.json({
                status: 204,
                results: "User does not exist",
            });
        } else {
            res.json({
                status: 200,
                results: results,
            });
        }
    });
});

//*DELETE USER WITH SPECIFIC ID*//

router.delete("/users/:id", (req, res) => {
    // Query
    const strQry = `
    DELETE FROM users 
    WHERE id = ?;
    ALTER TABLE users AUTO_INCREMENT = 1;
    `;
    db.query(strQry, [req.params.id], (err, data) => {
        if (err) throw err;
        res.send(`USER HAS BEEN DELETED`);
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------PRODUCT ROUTES-----------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*GET ALL PRODUCTS*//

router.get("/products", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM products;
    `;
    db.query(strQry, (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results,
        });
    });
});

//*GET ONE PRODUCT*//

router.get("/products/:id", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM products
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results.length <= 0 ? "Sorry, no product was found." : results,
        });
    });
});

//*CREATE A NEW PRODUCT*//

router.post("/products", bodyParser.json(), (req, res) => {
    const bd = req.body;
    // bd.totalamount = bd.quantity * bd.price;
    // Query
    const strQry = `
    INSERT INTO products(title, price, category, description, img)
    VALUES(?, ?, ?, ?, ?);
    `;
    db.query(
        strQry,
        [bd.title, bd.price, bd.category, bd.description, bd.img],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} PRODUCT/S ADDED`);
        }
    );
});

//*UPDATE A PRODUCT*//

router.put("/products/:id", bodyParser.json(), (req, res) => {
    // const bd = req.body;
    // Query
    const strQry = `
    UPDATE products 
    SET title=?, price=?, category=?, description=?,  img=?
    WHERE id=?`;
    db.query(
        strQry,
        [req.body.title, req.body.price, req.body.category, req.body.description, req.body.img, req.params.id],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} PRODUCT/S UPDATED`);
        }
    );
});

//*DELETE A PRODUCT WITH A SPECIFIC ID*//

app.delete("/products/:id", (req, res) => {
    // QUERY
    const strQry = `
    DELETE FROM products 
    WHERE id = ?;
    ALTER TABLE products AUTO_INCREMENT = 1;
    `;
    db.query(strQry, [req.params.id], (err, data) => {
        if (err) throw err;
        res.send(`${data.affectedRows} PRODUCT/S WAS DELETED`);
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------PAINTING ROUTES----------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*GET ALL PAINTINGS*//

router.get("/paintings", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM paintings;
    `;
    db.query(strQry, (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results,
        });
    });
});

//*GET ONE PAINTING*//

router.get("/paintings/:id", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM paintings
    WHERE id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results.length <= 0 ? "Sorry, no painting was found." : results,
        });
    });
});

//*CREATE A NEW PAINTING*//

router.post("/paintings", bodyParser.json(), (req, res) => {
    const bd = req.body;
    // Query
    const strQry = `
    INSERT INTO paintings(title, price, category, description, size, img)
    VALUES(?, ?, ?, ?, ?, ?);
    `;
    db.query(
        strQry,
        [bd.title, bd.price, bd.category, bd.description, bd.size, bd.img],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} PAINTING ADDED`);
        }
    );
});

//*DELETE A PAINTING WITH A SPECIFIC ID*//

app.delete("/paintings/:id", (req, res) => {
    // QUERY
    const strQry = `
    DELETE FROM paintings 
    WHERE id = ?;
    ALTER TABLE paintings AUTO_INCREMENT = 1;
    `;
    db.query(strQry, [req.params.id], (err, data) => {
        if (err) throw err;
        res.send(`${data.affectedRows} PAINTING WAS DELETED`);
    });
});

//*UPDATE A PAINTING*//

router.put("/paintings/:id", bodyParser.json(), (req, res) => {
    // const bd = req.body;
    // Query
    const strQry = `
    UPDATE paintings 
    SET title=?, price=?, category=?, description=?, size=?, img=?
    WHERE id=?`;
    db.query(
        strQry,
        [req.body.title, req.body.price, req.body.category, req.body.description, req.body.size, req.body.img, req.params.id],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} PAINTING UPDATED`);
        }
    );
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------CART ROUTES--------------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
module.exports = {
    devServer: {
        Proxy: "*",
    },
};

