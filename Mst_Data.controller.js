const Mst_Data_Model = require("../models/Mst_Data.model");
const Code = require("../../../../helper/responseMsg");
const { Common, Financial, CommonData } =  require("../../../../helper");
const axios = require('axios');
const qs = require('qs');
const _ = require("lodash");
const CrudMessage = Common.CrudMessages()

var client_id = "c3770086-493e-4403-83e6-f11cf37e77cf";
var client_secret = "rpz8Q~BvgBsi.LO8IDamQbiExW4sf7T-br8tnbyh";
var dynamicUrl = "https://login.microsoftonline.com/8d1028e4-7edf-4c8a-ad4a-d211ecac75f5/oauth2/v2.0/token";
var username = "admin@easyleaseae.onmicrosoft.com";
var password = "Note1803EL";
var scope = `${process.env.ErpUrl}/.default`;
var resource = "login.microsoftonline.com";
var webApiUrl = `${process.env.ErpUrl}/data/`;
const postData = {
    client_id: client_id,
    scope: scope,
    client_secret: client_secret,
    grant_type: 'client_credentials'
};
/*  Master Data - Get token for ERP integration  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.GetDynamic365Token = async (req, res) => {

    let token = '';
    token = await axios
        .post(dynamicUrl, qs.stringify(postData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => {
            return response.data.access_token;
        }).catch(err => {
            console.log(err);
        })

    //add record
    let postCustomerData = {
        "dataAreaId": "el01",
        "CustomerAccount": "CU4000",
        "CustomerGroupId": "OTR SRV",
        "SalesCurrencyCode": "AED",
        "OrganizationName": "050 DNK"
    };
    let postUrl = `${process.env.ErpUrl}/data/CustomersV2`;
    let postresponse = await axios
        .post(postUrl, postCustomerData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            return response.data;
        }).catch(err => {
            console.log(err);
        });

    //list records
    // let CustomerData = {};
    // let getUrl = "${process.env.ErpUrl}/data/CustomersV2/?$filter=dataAreaId eq 'EL01'&cross-company=true";
    // CustomerData = await axios.get(getUrl, {
    //     headers: {
    //         'Authorization': `Bearer ${token}`
    //     }
    // }).then((res) => {
    //     return res.data
    // }).catch((error) => {
    //     console.error(error)
    // })

    res.send(postresponse);

}
/*----------------End-------------*/

/*  Master Data - Get role data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.RoleList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};

    Mst_Data_Model.RoleDataList(req.body, (err, data2) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            data['list'] = data2;
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get parameter value data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.ParameterValueList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};

    Mst_Data_Model.ParameterValueDataList(req.body, (err, data2) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            data['list'] = data2;
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get parameter type data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.ParameterTypeList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};

    Mst_Data_Model.ParameterTypeDataList(req.body, (err, data2) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            data['list'] = data2;
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get workshop data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.WorkShopList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};

    Mst_Data_Model.WorkShopDataList(req.body, (err, data2) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            data['list'] = data2;
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get user data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.UserList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};

    Mst_Data_Model.UserDataList(req.body, (err, data2) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            data['list'] = data2;
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - check user exist or not
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.ValidateUser = async (req, res) => {
    let user = await CommonData.ValidateUser(req.body)
    if (user == -1)
        res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, "Please provide either email or username", req.body.Token, {}));
    else if (user == 0)
        res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, "User not found", req.body.Token, {}));
    else
        res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, user));
};
/*----------------End-------------*/

/*  Master Data - Get page data for dropdown  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.Mst_PageList = (req, res) => {
    Mst_Data_Model.Mst_Page_List(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data));
        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get parameter value data  
    Develop by vivek 
*/ 
/*----------------Start-------------*/
exports.GetParameterValue = async (req, res) => {
    Mst_Data_Model.GetParameterValue(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));

        }
    });
};
/*----------------End-------------*/

/*  Master Data - Get user details  
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.GetUserDetails = async (req, res) => {
    Mst_Data_Model.GetUserDetails(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/*----------------End-------------*/

/* Master Data - Get work shop data  
 * Develop by - vivek 
 * ----------------Start WorkShopDropDown------------- */
exports.WorkShopDropDown = async (req, res) => {
    let Request = { Name : 'mst_workshop', ID : 'WorkShopID', Text : 'WorkshopName'}
    Mst_Data_Model.GetDropDownValue(Request, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/* ----------------End WorkShopDropDown------------- */

/* Master Data - Get vehicle data  
 * Develop by - vivek 
 * ----------------Start VehicleDropDown------------- */
exports.VehicleDropDown = async (req, res) => {
   Mst_Data_Model.VehicleDropDown(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/* ----------------End VehicleDropDown------------- */

/* Master Data - Get Rider From Bike Plate No  
 * Develop by - Vivek 
 * ----------------Start GetRiderDataFromPlateNo------------- */
exports.GetRiderDataFromPlateNo = async (req, res) => {
    Mst_Data_Model.GetRiderDataFromPlateNo(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/* ----------------End GetRiderDataFromPlateNo------------- */

/* WorkShopSchedule - Get Work shop schedule
 * Develop by - Vivek 
 * ----------------Start WorkShopschedule------------- */
exports.WorkShopschedule = async (req, res) => {
    Mst_Data_Model.WorkShopschedule(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/* ----------------End WorkShopschedule------------- */

/* MasterService - Get CategoryMaster data 
 * Develop by - Vivek 
 * ----------------Start CategoryMaster------------- */
exports.CategoryMaster = async (req, res) => {
    Mst_Data_Model.CategoryMaster(req.body, (err, data) => {
        if (err) {
            res.status(200).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, (err?.sqlMessage ? err?.sqlMessage : err.message), req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));

        }
    });
};
/*----------------End  CategoryMaster-------------*/

