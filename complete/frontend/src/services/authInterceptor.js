const AuthInterceptor = {
  auth: null,
  setAuth: function (auth) {
    this.auth = auth;
  },
  getAuth: function () {
    return this.auth;
  }
};

export default AuthInterceptor;