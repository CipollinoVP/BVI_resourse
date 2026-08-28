import React, { useState} from 'react';
import {connect, Provider} from "react-redux";
import {compose} from 'redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom'
import Main from './Components/Main/Main'
import './App.css';


function FrontApp() {
    const [styl, setStyle] = useState("App")

    return (<BrowserRouter>

                <div className={styl}>
                    <div class='body'>
                        <Routes>
                            <Route exact={true} path={"/"} element={<Main/>}/>
                         </Routes>
                    </div>
                </div>

            </BrowserRouter>
            )

}

export default FrontApp;