

export default class MockImageService {

  static oldImagesHandler = async(imageUrl, saver = false) => {
    return Promise.resolve(true)
   // return saver === true ? await this.#saveImageInDb(imageUrl) : await this.#deleteFromStorage(imageUrl)
  }

  static deleteImage = async (data, isId = false) => {
   return Promise.resolve({success: true, data})
  }

  static getImages = async () => {
    return Promise.resolve([{id: 1, imageUrl: "NoData"}])
  }
 
}
