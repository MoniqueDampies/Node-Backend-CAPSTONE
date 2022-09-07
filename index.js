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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-*", "*");
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

//*LOGIN USER*// tested working

app.post("/login", bodyParser.json(), (req, res) => {
    try {
        // Get email and password
        const {
            email,
            password
        } = req.body;

        const strQry = `
        SELECT *
        FROM users
        WHERE email = '${email}';
        `;
        db.query(strQry, async (err, results) => {
            if (err) throw err;
            switch (true) {
                case await compare(password, results[0].password):
                    jwt.sign(
                        JSON.stringify(results[0]),
                        process.env.secret,
                        (err, token) => {
                            res.json({
                                status: 200,
                                msg: `Login successful`,
                                user: results,
                                token: token,
                            });
                        }
                    );
                    break;
                default:
                    res.json({
                        status: 400,
                        msg: "Incorrect Password or Email. Please try again.",
                    });
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
        if (err) {
            res.json({
                status: 400,
                results: "The provided email/phone number exists. Please enter another one",
            });
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
                    if (err) {
                        res.json({
                            status: 400,
                            msg: "Registration Failed. Email already taken. Please try again",
                        });
                    } else {
                        res.json({
                            status: 200,
                            msg: "Registration Successful. Please Login. ",
                        });
                    }
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
        res.json({
            status: 200,
            results: results.length <= 0 ? "Sorry, no user was found." : results,
        });
    });
});

//*GET A USER WITH A SPECIFIC ID*//

router.get("/users/:id", (req, res) => {
    const query = `SELECT * FROM users WHERE id=${req.params.id}`;
    db.query(query, req.params.id, (err, results) => {
        if (err) throw err;
        res.json({
            status: 200,
            results: results.length <= 0 ? "Sorry, no user was found." : results,
        });
    });
});

//*UPDATE A USER*//
router.put("/users/:id", bodyParser.json(), async (req, res) => {
    const { firstName, lastName, email, phone, province, country, isAdmin, password } = req.body;
    let sql = `UPDATE users SET ? WHERE id = ${req.params.id} `;
    const user = {
        firstName, lastName, email, phone, province, country, isAdmin, password
    };
    db.query(sql, user, (err) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Updated failed ${err}`,
            });
        } else {
            res.json({
                status: 200,
                msg: "Updated Successfull",
            });
        }
    });
});


//*DELETE USER WITH SPECIFIC ID*//
app.delete('/users/:id', (req, res) => {
    // mySQL query
    const strQry =
        `
    DELETE FROM users WHERE id = ${req.params.id};
    ALTER TABLE users AUTO_INCREMENT = 1;
    `;

    db.query(strQry, [req.params.id], (err, results) => {
        if (err)
            res.json({
                status: 400,
                msg: `${err}`
            })
                ;
        // else
        res.json({
            status: 200,
            msg: `Deleted Successfully`
        });
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
            results: results.length <= 0 ? "Sorry, no products was found." : results,
        });
    });
});

//*GET ONE PRODUCT*//

router.get("/products/:id", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM products
    WHERE id = ${req.params.id};
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

app.post("/products", bodyParser.json(), (req, res) => {
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
            if (err) {
                res.json({
                    status: 400,
                    msg: `Failed to create product`
                });
            } else {
                res.json({
                    status: 200,
                    msg: `${results.affectedRows} PRODUCT/S ADDED`,
                });
            }
        }
    );
});

//*UPDATE A PRODUCT*//

app.put("/products/:id", bodyParser.json(), (req, res) => {
    // const bd = req.body;
    // Query
    const strQry = `
    UPDATE products 
    SET title=?, price=?, category=?, description=?,  img=?
    WHERE id=${req.params.id}`;
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
            if (err) {
                res.json({
                    status: 400,
                    msg: `Failed to update product`
                });
            } else {
                res.json({
                    status: 200,
                    msg: `${results.affectedRows} PRODUCT/S UPDATED`,
                });
            }
        }
    );
});

//*DELETE A PRODUCT WITH A SPECIFIC ID*//

app.delete("/products/:id", (req, res) => {
    // QUERY
    const strQry = `
    DELETE FROM products 
    WHERE id = ${req.params.id};
    ALTER TABLE products AUTO_INCREMENT = 1;
    `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete product`
            });
        } else {
            res.json({
                status: 200,
                msg: `${results.affectedRows} PRODUCT/S DELETED`,
            });
        }
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
            results: results.length <= 0 ? "Sorry, no paintings was found." :results,
        });
    });
});

//*GET ONE PAINTING*//

router.get("/paintings/:id", (req, res) => {
    // Query
    const strQry = `
    SELECT *
    FROM paintings
    WHERE id = ${req.params.id};
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

app.post("/paintings", bodyParser.json(), (req, res) => {
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
            if (err) {
                res.json({
                    status: 400,
                    msg: `Failed to create painting`
                });
            } else {
                res.json({
                    status: 200,
                    msg: `${results.affectedRows} PAINTING/S ADDED`,
                });
            }
        }
    );
});

//*DELETE A PAINTING WITH A SPECIFIC ID*//

app.delete("/paintings/:id", (req, res) => {
    // QUERY
    const strQry = `
    DELETE FROM paintings 
    WHERE id = ${req.params.id};
    ALTER TABLE paintings AUTO_INCREMENT = 1;
    `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete paintings`
            });
        } else {
            res.json({
                status: 200,
                msg: `${results.affectedRows} PAINTING/S DELETED`,
            });
        }
    });
});

//*UPDATE A PAINTING*//

app.put("/paintings/:id", bodyParser.json(), (req, res) => {
    // const bd = req.body;
    // Query
    const strQry = `
    UPDATE paintings 
    SET title=?, price=?, category=?, description=?, size=?, img=?
    WHERE id=${req.params.id}`;
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
            if (err) {
                res.json({
                    status: 400,
                    msg: `Failed to update painting`
                });
            } else {
                res.json({
                    status: 200,
                    msg: `${results.affectedRows} PAINTING/S UPDATED`,
                });
            }
        }
    );
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//--------------------------------------------PRODUCTS CART ROUTES--------------------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*ADD PRODUCTS TO CART FROM SPECIFIC USER*//*** */

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
            let {
                id
            } = req.body;
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
                    if (err) throw err;
                    res.json({
                        status: 200,
                        cart: results,
                    });
                });
            });
        }
    });
});

//*GET ALL CART PRODUCTS FROM SPECIFIC USER*//*** */

router.get("/users/:id/cart", (req, res) => {
    // Query
    const strQry = `
        SELECT *
        FROM users
        WHERE id = ${req.params.id};
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (results.length < 1) {
            res.json({
                status: 400,
                results: "No items in cart",
            });
        } else {
            res.json({
                status: 200,
                results: JSON.parse(results[0].cart),
            });
        }
    });
});

//*GET SINGLE PRODUCTS OUT OF CART FROM SPECIFIC USER*//

router.get("/users/:id/cart/:cartid", (req, res) => {
    // Query
    const strQry = `
        SELECT *
        FROM users
        WHERE id = ${req.params.id};
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (results.length < 1) {
            res.json({
                status: 400,
                msg: `Failed to view cart item`
            });
        }
        let cartResults = JSON.parse(results[0].cart);
        res.json({
            status: 200,
            results: cartResults.filter((item) => {
                return item.cart_id == req.params.cartid;
            }),
        });
    });
});

//*DELETE ALL PRODUCTS FROM CART FOR SPECIFIC USER*//*** */

router.delete("/users/:id/cart", (req, res) => {
    // Query
    const strQry = `
        UPDATE users
        SET cart=null
        WHERE id=${req.params.id}
        `;
    db.query(strQry, [req.params.id], (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete cart item`
            });
        }
        res.json({
            status: 200,
            results: results,
            msg: `Cart cleared`
        });
    });
});

//*DELETE SPECIFIC CART PRODUCTS FROM SPECIFIC USER*//*** */

router.delete("/users/:id/cart/:cartid", (req, res) => {
    const delSingleCartId = `
    SELECT cart FROM users
    WHERE id = ${req.params.id}
`;
    db.query(delSingleCartId, (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete cart item`
            });
        }
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
                    if (err) {
                        res.json({
                            status: 400,
                            msg: `Failed to delete cart item`
                        });
                    }
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
//--------------------------------------------PAINTINGS CART ROUTES-----------------------------------------------//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//*ADD PAINTINGS TO ART CART FROM SPECIFIC USER*//

router.post("/users/:id/artcart", bodyParser.json(), (req, res) => {
    // mySQL query
    let artcart = `SELECT artcart FROM users WHERE id = ${req.params.id};`;
    // function
    db.query(artcart, (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to get cart item`
            });
        }
        if (results.length > 0) {
            let artcart;
            if (results[0].artcart == null) {
                artcart = [];
            } else {
                artcart = JSON.parse(results[0].artcart);
            }
            let {
                id
            } = req.body;
            // mySQL query
            let paintings = `Select * FROM paintings WHERE id = ?`;
            // function
            db.query(paintings, id, (err, paintingsData) => {
                if (err) {
                    res.json({
                        status: 400,
                        msg: `Failed to update cart`
                    });
                } else {
                    let data = {
                        artcart_id: artcart.length + 1,
                        paintingsData,
                    };
                    artcart.push(data);
                    console.log(artcart);
                    let updateArtCart = `UPDATE users SET artcart = ? WHERE id = ${req.params.id}`;
                    db.query(updateArtCart, JSON.stringify(artcart), (err, results) => {
                        if (err) {
                            res.json({
                                status: 400,
                                msg: `Failed to update cart`
                            });
                        } else {
                            res.json({
                                status: 200,
                                artcart: results,
                            });
                        }
                    });
                }
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
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to get cart item`
            });
        } else {
            let artcartResults = JSON.parse(results[0].artcart);
            res.json({
                status: 200,
                results: artcartResults.filter((item) => {
                    return item.artcart_id == req.params.cartid;
                }),
            });
        }
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
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete cart item`
            });
        } else {
            res.json({
                status: 200,
                results: results,
            });
        }
    });
});

//*DELETE SPECIFIC ART CART PRODUCTS FROM SPECIFIC USER*//  //*NOT WORKING :(*//

router.delete("/users/:id/artcart/:cartid", (req, res) => {
    const deleteSingleArtCartId = `
    SELECT artcart FROM users
    WHERE id = ${req.params.id}
`;
    db.query(deleteSingleArtCartId, (err, results) => {
        if (err) {
            res.json({
                status: 400,
                msg: `Failed to delete cart item`
            });
        }
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
                    if (err) {
                        res.json({
                            status: 400,
                            msg: `Failed to view cart item`
                        });
                    } else {
                        res.json({
                            status: 200,
                            results: "Successfully deleted item from the artcart",
                        });
                    }
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