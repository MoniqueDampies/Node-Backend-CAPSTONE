// IMPORTING MODULES
require("dotenv").config();
const db = require("./config/dbconn");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const {
    genSalt,
    compare,
    hash
} = require("bcrypt");
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

app.use(
    cors({
        origin: ["http://127.0.0.1:8080", "http://localhost:8080"],
        credentials: true,
    })
);

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
db.connect((err) => {
    if (err) {
        console.log(`MySql is not connected...<br>
        ${err}`);
    } else {
        console.log("MySql connected...");
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// HOME PAGE ROUTER
router.get("/", (req, res) => {
    res.status(200).sendFile("./views/index.html", {
        root: __dirname,
    });
});

// LOGIN PAGE ROUTER
router.get("/login", (req, res) => {
    res.status(200).sendFile("./views/login.html", {
        root: __dirname,
    });
});

// REGISTER PAGE ROUTER
router.get("/register", (req, res) => {
    res.status(200).sendFile("./views/register.html", {
        root: __dirname,
    });
});

//*PRODUCTS PAGE ROUTER*//
router.get("/productss", (req, res) => {
    res.status(200).sendFile("./views/products.html", {
        root: __dirname,
    });
});

// //*404 PAGE ROUTER*//
// router.get("/:type", (req, res) => {
//     res.status(200).sendFile("./views/404.html", {
//         root: __dirname,
//     });
// });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//-----------------------------------------VERIFICATION ROUTES---------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*LOGIN USER*//

app.post("/login", bodyParser.json(), (req, res) => {
    try {
        // Get email and password
        const {
            email,
            password
        } = req.body;
        const strQry = `
        SELECT email, password
        FROM users
        WHERE email = '${email}';
        `;
        db.query(strQry, async (err, results) => {
            if (err) throw err;
            const key = jwt.sign(JSON.stringify(results[0]), process.env.secret);
            res
                .send(
                    `<nav>
            <a href="/">HOME</a> |
            <a href="/productss">PRODUCTS</a>
            </nav> <br>
            LOGIN SUCCESSFUL`
                )
                .json({
                    status: 200,
                    results: key,
                });
            localStorage.setItem("key", JSON.stringify(key));
            key = localStorage.getItem("key");
            switch (true) {
                case await compare(password, results[0].password):
                    break;
                default:
                    console.log("Bye");
            }
        });
    } catch (e) {
        console.log(`From login: ${e.message}`);
    }
});

//*USER REGISTRATION*//
//*ADD NEW USER*//

app.post("/register", bodyParser.json(), (req, res) => {
    let emails = `SELECT email FROM users WHERE ?`;
    let email = {
        email: req.body.email,
    };
    db.query(emails, email, async (err, results) => {
        if (err) throw err;
        // VALIDATION
        if (results.length > 0) {
            res.send(
                "The provided email/phone number exists. Please enter another one"
            );
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
                    bd.country,
                ],
                (err, results) => {
                    if (err) throw err;
                    res.send(`
                    <nav>
                    <a href="/">HOME</a> |
                    <a href="/register">REGISTER</a> |
                    <a href="/login">LOGIN</a>
                    </nav> <br>
                    ${results.affectedRows} NEW USER ADDED <BR>
                    REGISTRATION SUCCESSFUL!
                    `);
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

//*UPDATE A USER*//

router.put("/users/:id", bodyParser.json(), (req, res) => {
    // Query
    const strQry = `
    UPDATE users
    SET firstName=?, lastName=?, email=?, phone=?, province=?, country=?
    WHERE id=?`;
    db.query(
        strQry,
        [
            req.body.firstName,
            req.body.lastName,
            req.body.email,
            req.body.phone,
            req.body.province,
            req.body.country,
            req.params.id,
        ],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} USER DETAILS UPDATED`);
        }
    );
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
        [
            req.body.title,
            req.body.price,
            req.body.category,
            req.body.description,
            req.body.img,
            req.params.id,
        ],
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
        [
            req.body.title,
            req.body.price,
            req.body.category,
            req.body.description,
            req.body.size,
            req.body.img,
            req.params.id,
        ],
        (err, results) => {
            if (err) throw err;
            res.send(`${results.affectedRows} PAINTING UPDATED`);
        }
    );
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------PRODUCTS CART ROUTES--------------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*ADD PRODUCTS TO CART FROM SPECIFIC USER*//

router.post("/users/:id/cart", bodyParser.json(), (req, res) => {
    // mySQL query
    let cart = `SELECT cart FROM users WHERE id = ${req.params.id};`;
    // function
    db.query(cart, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            let cart;
            if (results[0].cart == null) {
                cart = [];
            } else {
                cart = JSON.parse(results[0].cart);
            }
            let {id} = req.body;
            // mySQL query
            let product = `Select * FROM products WHERE id = ?`;
            // function
            db.query(product, id, (err, productData) => {
                if (err) res.send(`${err}`);
                let data = {
                    cart_id: cart.length + 1,
                    productData,
                };
                cart.push(data);
                console.log(cart);
                let updateCart = `UPDATE users SET cart = ? WHERE id = ${req.params.id}`;
                db.query(updateCart, JSON.stringify(cart), (err, results) => {
                    if (err) res.send(`${err}`);
                    res.json({
                        cart: results,
                    });
                });
            });
        }
    });
});

//*GET ALL CART PRODUCTS FROM SPECIFIC USER*//

router.get("/users/:id/cart", (req, res) => {
    // Query
        const strQry = `
        SELECT *
        FROM users
        WHERE id = ?;
        `;
        db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: JSON.parse(results[0].cart),
        });
    });
});

//*GET SINGLE PRODUCTS OUT OF CART FROM SPECIFIC USER*//

router.get("/users/:id/cart/:cartid", (req, res) => {
    // Query
            const strQry = `
        SELECT *
        FROM users
        WHERE id = ?;
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        let cartResults = JSON.parse(results[0].cart);
        res.json({
            status: 200,
            results: cartResults.filter((item)=>{
                return item.cart_id == req.params.cartid
            }),
        });
    });
});

//*DELETE ALL PRODUCTS FROM CART FOR SPECIFIC USER*//

router.delete("/users/:id/cart", (req, res) => {
    // Query
    const strQry = `
        UPDATE users
        SET cart=null
        WHERE id=?
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results,
        });
    });
});

//*DELETE SPECIFIC CART PRODUCTS FROM SPECIFIC USER*//

router.delete("/users/:id/cart/:cartid", (req, res) => {
    const delSingleCartId = `
    SELECT cart FROM users
    WHERE id = ${req.params.id}
`;
    db.query(delSingleCartId, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            if (results[0].cart != null) {
                const result = JSON.parse(results[0].cart).filter((cart) => {
                    return cart.cart_id != req.params.cartid;
                });
                result.forEach((cart, i) => {
                    cart.cart_id = i + 1;
                });
                const query = `
                UPDATE users
                SET cart = ?
                WHERE id = ${req.params.id}
            `;
                db.query(query, [JSON.stringify(result)], (err, results) => {
                    if (err) throw err;
                    res.json({
                        status: 200,
                        results: "Successfully deleted item from cart",
                    });
                });
            } else {
                res.json({
                    status: 400,
                    results: "This user has an empty cart",
                });
            }
        } else {
            res.json({
                status: 400,
                results: "There is no user with that id",
            });
        }
    });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------PAINTINGS CART ROUTES--------------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//*ADD PAINTINGS TO ART CART FROM SPECIFIC USER*//

router.post("/users/:id/artcart", bodyParser.json(), (req, res) => {
    // mySQL query
    let artcart = `SELECT artcart FROM users WHERE id = ${req.params.id};`;
    // function
    db.query(artcart, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            let artcart;
            if (results[0].artcart == null) {
                artcart = [];
            } else {
                artcart = JSON.parse(results[0].artcart);
            }
            let {id} = req.body;
            // mySQL query
            let paintings = `Select * FROM paintings WHERE id = ?`;
            // function
            db.query(paintings, id, (err, paintingsData) => {
                if (err) res.send(`${err}`);
                let data = {
                    artcart_id: artcart.length + 1,
                    paintingsData,
                };
                artcart.push(data);
                console.log(artcart);
                let updateArtCart = `UPDATE users SET artcart = ? WHERE id = ${req.params.id}`;
                db.query(updateArtCart, JSON.stringify(artcart), (err, results) => {
                    if (err) res.send(`${err}`);
                    res.json({
                        artcart: results,
                    });
                });
            });
        }
    });
});

//*GET ALL CART PAINTINGS FROM SPECIFIC USER*//

router.get("/users/:id/artcart", (req, res) => {
    // Query
        const strQry = `
        SELECT *
        FROM users
        WHERE id = ?;
        `;
        db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: JSON.parse(results[0].artcart),
        });
    });
});

//*GET SINGLE PRODUCTS OUT OF CART FROM SPECIFIC USER*//

router.get("/users/:id/artcart/:cartid", (req, res) => {
    // Query
            const strQry = `
        SELECT *
        FROM users
        WHERE id = ?;
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        let artcartResults = JSON.parse(results[0].artcart);
        res.json({
            status: 200,
            results: artcartResults.filter((item)=>{
                return item.artcart_id == req.params.cartid
            }),
        });
    });
});

//*DELETE ALL PRODUCTS FROM CART FOR SPECIFIC USER*//

router.delete("/users/:id/artcart", (req, res) => {
    // Query
    const strQry = `
        UPDATE users
        SET artcart=null
        WHERE id=?
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results,
        });
    });
});

//*DELETE SPECIFIC ART CART PRODUCTS FROM SPECIFIC USER*//  //*NOT WORKING :(*//

router.delete("/users/:id/artcart/:cartid", (req, res) => {
    const deleteSingleArtCartId = `
    SELECT artcart FROM users
    WHERE id = ${req.params.id}
`;
    db.query(deleteSingleArtCartId, (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            if (results[0].artcart != null) {
                const result = JSON.parse(results[0].artcart).filter((artcart) => {
                    return artcart.artcart_id != req.params.artcartid;
                });
                result.forEach((artcart, i) => {
                    artcart.artcart_id = i + 1;
                });
                const query = `
                UPDATE users
                SET artcart = ?
                WHERE id = ${req.params.id}
            `;
                db.query(query, [JSON.stringify(result)], (err, results) => {
                    if (err) throw err;
                    res.json({
                        status: 200,
                        results: "Successfully deleted item from the artcart",
                    });
                });
            } else {
                res.json({
                    status: 400,
                    results: "This user has an empty the artcart",
                });
            }
        } else {
            res.json({
                status: 400,
                results: "There is no user with that id",
            });
        }
    });
});

//////////////////////////////////////////////////////////////////////////////////////
module.exports = {
    devServer: {
        Proxy: "*",
    },
};