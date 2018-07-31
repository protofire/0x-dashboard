import React from "react";
import { Switch } from "react-router-dom";
import Dashboard from "./Dashboard";
import Trades from "./Trades";
import NotFound from "./NotFound";
import AppliedRoute from "./AppliedRoute";

export default ({childProps}) => {
  return (
    <Switch>
        <AppliedRoute path="/" exact component={Dashboard} props={childProps}/>
        <AppliedRoute path="/trade" exact component={Trades} props={childProps}/>
        {/* Catch all unmatched routes */}
        <AppliedRoute component={NotFound}/>
    </Switch>
  )
}
