// const asyncHandler = (fn) =>{ ()=>{} }


//! High order function 
const asyncHandler = (fn) => async (req, res, next) =>{
  try {
    await fn(req, res, next);
  } catch (err) {
    res.status(err.code || 500).json({
      succuss: false,
      message: err.message
    })
  }
}

export {asyncHandler};

// Promise method
// const asyncHandler1 = (requestHandler) => {
//   (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
//   };
// };

