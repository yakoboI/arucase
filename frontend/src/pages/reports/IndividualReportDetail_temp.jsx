// If logo_image_path is already a Cloudinary URL, use it directly
                  if (school_logo.logo_image_path.startsWith('http')) {
                    return school_logo.logo_image_path;
                  }
